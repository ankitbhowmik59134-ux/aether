from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Alert, City, CityLive, User, Watch
from app.schemas import AlertOut, WatchCreate, WatchOut
from app.services import latest_fused, refresh_alerts_for_user

router = APIRouter(prefix="/api", tags=["watches"])


def _current_aqi(db: Session, city_id: int) -> int | None:
    live = db.get(CityLive, city_id)
    if live:
        return live.aqi
    latest = latest_fused(db, city_id)
    return latest.aqi if latest else None


@router.get("/watches", response_model=list[WatchOut])
def list_watches(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    watches = db.scalars(select(Watch).where(Watch.user_id == user.id)).all()
    out: list[WatchOut] = []
    for w in watches:
        city = db.get(City, w.city_id)
        out.append(
            WatchOut(
                id=w.id,
                city_id=w.city_id,
                city_name=city.name if city else "",
                aqi_threshold=w.aqi_threshold,
                latest_aqi=_current_aqi(db, w.city_id),
            )
        )
    return out


@router.post("/watches", response_model=WatchOut, status_code=status.HTTP_201_CREATED)
def create_watch(
    body: WatchCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not db.get(City, body.city_id):
        raise HTTPException(status_code=404, detail="City not found")
    existing = db.scalar(
        select(Watch).where(Watch.user_id == user.id, Watch.city_id == body.city_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Watch already exists")
    w = Watch(user_id=user.id, city_id=body.city_id, aqi_threshold=body.aqi_threshold)
    db.add(w)
    db.commit()
    db.refresh(w)
    city = db.get(City, body.city_id)
    refresh_alerts_for_user(db, user.id)
    return WatchOut(
        id=w.id,
        city_id=w.city_id,
        city_name=city.name if city else "",
        aqi_threshold=w.aqi_threshold,
        latest_aqi=_current_aqi(db, body.city_id),
    )


@router.delete("/watches/{watch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watch(
    watch_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    w = db.get(Watch, watch_id)
    if not w or w.user_id != user.id:
        raise HTTPException(status_code=404, detail="Watch not found")
    db.delete(w)
    db.commit()


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    refresh_alerts_for_user(db, user.id)
    alerts = db.scalars(
        select(Alert).where(Alert.user_id == user.id).order_by(Alert.created_at.desc())
    ).all()
    result: list[AlertOut] = []
    for a in alerts:
        city = db.get(City, a.city_id)
        result.append(
            AlertOut(
                id=a.id,
                city_id=a.city_id,
                city_name=city.name if city else "",
                message=a.message,
                current_aqi=a.current_aqi,
                threshold=a.threshold,
                created_at=a.created_at,
            )
        )
    return result
