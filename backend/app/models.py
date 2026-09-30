from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    watches: Mapped[list["Watch"]] = relationship(back_populates="user")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="user")


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    state: Mapped[str] = mapped_column(String(80))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    is_northern: Mapped[bool] = mapped_column(Boolean, default=False)

    source_readings: Mapped[list["SourceReading"]] = relationship(back_populates="city")
    fused_readings: Mapped[list["FusedReading"]] = relationship(back_populates="city")


class SourceReading(Base):
    __tablename__ = "source_readings"
    __table_args__ = (UniqueConstraint("city_id", "date", "source", name="uq_city_date_source"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    source: Mapped[str] = mapped_column(String(40))
    pm25: Mapped[float] = mapped_column(Float)
    pm10: Mapped[float] = mapped_column(Float)
    no2: Mapped[float] = mapped_column(Float)
    so2: Mapped[float] = mapped_column(Float)
    co: Mapped[float] = mapped_column(Float)
    o3: Mapped[float] = mapped_column(Float)

    city: Mapped["City"] = relationship(back_populates="source_readings")


class FusedReading(Base):
    __tablename__ = "fused_readings"
    __table_args__ = (UniqueConstraint("city_id", "date", name="uq_city_date_fused"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    pm25: Mapped[float] = mapped_column(Float)
    pm10: Mapped[float] = mapped_column(Float)
    no2: Mapped[float] = mapped_column(Float)
    so2: Mapped[float] = mapped_column(Float)
    co: Mapped[float] = mapped_column(Float)
    o3: Mapped[float] = mapped_column(Float)
    aqi: Mapped[int] = mapped_column(Integer)
    aqi_category: Mapped[str] = mapped_column(String(40))
    dominant_pollutant: Mapped[str] = mapped_column(String(20))

    city: Mapped["City"] = relationship(back_populates="fused_readings")


class CityLive(Base):
    __tablename__ = "city_live"

    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), primary_key=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime)
    source: Mapped[str] = mapped_column(String(80), default="open-meteo")
    pm25: Mapped[float] = mapped_column(Float)
    pm10: Mapped[float] = mapped_column(Float)
    no2: Mapped[float] = mapped_column(Float)
    so2: Mapped[float] = mapped_column(Float)
    co: Mapped[float] = mapped_column(Float)
    o3: Mapped[float] = mapped_column(Float)
    aqi: Mapped[int] = mapped_column(Integer)
    aqi_category: Mapped[str] = mapped_column(String(40))
    dominant_pollutant: Mapped[str] = mapped_column(String(20))

    city: Mapped["City"] = relationship()


class Watch(Base):
    __tablename__ = "watches"
    __table_args__ = (UniqueConstraint("user_id", "city_id", name="uq_user_city_watch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    aqi_threshold: Mapped[int] = mapped_column(Integer, default=200)

    user: Mapped["User"] = relationship(back_populates="watches")
    city: Mapped["City"] = relationship()


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    message: Mapped[str] = mapped_column(String(500))
    current_aqi: Mapped[int] = mapped_column(Integer)
    threshold: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="alerts")
    city: Mapped["City"] = relationship()
