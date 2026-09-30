"""Live air-quality refresh from the Open-Meteo CAMS model. No API key."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.aqi import compute_aqi
from app.database import SessionLocal
from app.forecast import clear_forecast_cache
from app.models import City, CityLive, FusedReading, SourceReading

OPEN_METEO = "https://air-quality-api.open-meteo.com/v1/air-quality"
SOURCE = "open-meteo-cams"
HOURLY = "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone"


def _co_mg(micrograms: float) -> float:
    # Open-Meteo reports CO in µg/m³. Indian CO sub-index uses mg/m³.
    return max(0.05, micrograms / 1000.0)


def _pack(pm25, pm10, no2, so2, co_ug, o3) -> dict[str, float] | None:
    if None in (pm25, pm10, no2, so2, co_ug, o3):
        return None
    return {
        "pm25": float(pm25),
        "pm10": float(pm10),
        "no2": float(no2),
        "so2": float(so2),
        "co": _co_mg(float(co_ug)),
        "o3": float(o3),
    }


def _fetch(client: httpx.Client, city: City) -> dict:
    response = client.get(
        OPEN_METEO,
        params={
            "latitude": city.latitude,
            "longitude": city.longitude,
            "current": HOURLY,
            "hourly": HOURLY,
            "timezone": "Asia/Kolkata",
            "past_days": 92,
            "forecast_days": 1,
        },
    )
    response.raise_for_status()
    return response.json()


def _daily_means(payload: dict) -> list[tuple[datetime, dict[str, float]]]:
    hourly = payload["hourly"]
    now = datetime.now()
    buckets: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for index, stamp in enumerate(hourly["time"]):
        moment = datetime.fromisoformat(stamp)
        if moment > now:
            continue
        packed = _pack(
            hourly["pm2_5"][index],
            hourly["pm10"][index],
            hourly["nitrogen_dioxide"][index],
            hourly["sulphur_dioxide"][index],
            hourly["carbon_monoxide"][index],
            hourly["ozone"][index],
        )
        if not packed:
            continue
        day = stamp[:10]
        for key, value in packed.items():
            buckets[day][key].append(value)
    days = []
    for day in sorted(buckets):
        means = {key: sum(values) / len(values) for key, values in buckets[day].items()}
        days.append((datetime.fromisoformat(day), means))
    return days


def _apply(db: Session, city: City, payload: dict) -> None:
    days = _daily_means(payload)
    if len(days) < 30:
        raise RuntimeError(f"{city.name} returned too little history")

    db.execute(delete(FusedReading).where(FusedReading.city_id == city.id))
    db.execute(delete(SourceReading).where(SourceReading.city_id == city.id))

    for moment, means in days:
        aqi = compute_aqi(**means)
        db.add(
            FusedReading(
                city_id=city.id,
                date=moment.date(),
                aqi=aqi.aqi,
                aqi_category=aqi.category,
                dominant_pollutant=aqi.dominant,
                **means,
            )
        )
        db.add(
            SourceReading(
                city_id=city.id,
                date=moment.date(),
                source=SOURCE,
                **means,
            )
        )

    current = payload.get("current") or {}
    packed = _pack(
        current.get("pm2_5"),
        current.get("pm10"),
        current.get("nitrogen_dioxide"),
        current.get("sulphur_dioxide"),
        current.get("carbon_monoxide"),
        current.get("ozone"),
    )
    if not packed:
        moment, packed = days[-1]
        observed = moment
    else:
        observed = datetime.fromisoformat(current["time"])
    aqi = compute_aqi(**packed)
    live = db.get(CityLive, city.id)
    if not live:
        live = CityLive(city_id=city.id)
        db.add(live)
    live.observed_at = observed
    live.refreshed_at = datetime.utcnow()
    live.source = SOURCE
    live.pm25 = packed["pm25"]
    live.pm10 = packed["pm10"]
    live.no2 = packed["no2"]
    live.so2 = packed["so2"]
    live.co = packed["co"]
    live.o3 = packed["o3"]
    live.aqi = aqi.aqi
    live.aqi_category = aqi.category
    live.dominant_pollutant = aqi.dominant


def refresh_live(db: Session | None = None) -> int:
    own_session = db is None
    if own_session:
        db = SessionLocal()
    updated = 0
    try:
        cities = db.scalars(select(City).order_by(City.id)).all()
        with httpx.Client(timeout=40) as client:
            for city in cities:
                payload = _fetch(client, city)
                _apply(db, city, payload)
                updated += 1
        db.commit()
        clear_forecast_cache()
        return updated
    except Exception:
        db.rollback()
        raise
    finally:
        if own_session:
            db.close()

