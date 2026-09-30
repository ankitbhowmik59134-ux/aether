from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class CitySummary(BaseModel):
    id: int
    name: str
    slug: str
    state: str
    latitude: float
    longitude: float
    latest_aqi: int | None
    latest_category: str | None
    latest_pm25: float | None
    trend_direction: Literal["up", "down", "flat"] | None
    dominant_pollutant: str | None
    observed_at: datetime | None = None
    source: str | None = None


class CityDetail(CitySummary):
    latest_date: date | None
    pollutants: dict[str, float] | None


class SeriesPoint(BaseModel):
    date: date
    value: float


class WatchCreate(BaseModel):
    city_id: int
    aqi_threshold: int = Field(ge=50, le=500, default=200)


class WatchOut(BaseModel):
    id: int
    city_id: int
    city_name: str
    aqi_threshold: int
    latest_aqi: int | None

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    city_id: int
    city_name: str
    message: str
    current_aqi: int
    threshold: int
    created_at: datetime
