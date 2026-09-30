from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _email(value: str) -> str:
    return value.strip().lower()


def _token_for(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.post("/access", response_model=TokenResponse)
def access(body: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    """First visit with an email creates that person's account. Later visits log in."""
    email = _email(str(body.email))
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, password_hash=hash_password(body.password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return _token_for(user)
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This email already has an account. Use the password from the first time you signed in.",
        )
    return _token_for(user)


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    return access(body, db)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    email = _email(str(body.email))
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="No account for that email yet, or the password does not match.")
    return _token_for(user)
