from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert, City, CityLive, FusedReading, Watch


def latest_fused(db: Session, city_id: int) -> FusedReading | None:
    return db.scalar(
        select(FusedReading)
        .where(FusedReading.city_id == city_id)
        .order_by(FusedReading.date.desc())
        .limit(1)
    )


def trend_direction(db: Session, city_id: int) -> str | None:
    rows = db.execute(
        select(FusedReading.pm25)
        .where(FusedReading.city_id == city_id)
        .order_by(FusedReading.date.desc())
        .limit(14)
    ).all()
    if len(rows) < 7:
        return None
    recent = sum(r[0] for r in rows[:7]) / 7
    prior = sum(r[0] for r in rows[7:14]) / 7
    if recent > prior * 1.05:
        return "up"
    if recent < prior * 0.95:
        return "down"
    return "flat"


def city_summary(db: Session, city: City) -> dict:
    live = db.get(CityLive, city.id)
    latest = latest_fused(db, city.id)
    reading = live or latest
    return {
        "id": city.id,
        "name": city.name,
        "slug": city.slug,
        "state": city.state,
        "latitude": city.latitude,
        "longitude": city.longitude,
        "latest_aqi": reading.aqi if reading else None,
        "latest_category": reading.aqi_category if reading else None,
        "latest_pm25": round(reading.pm25, 2) if reading else None,
        "trend_direction": trend_direction(db, city.id),
        "dominant_pollutant": reading.dominant_pollutant if reading else None,
        "observed_at": live.observed_at if live else (datetime.combine(latest.date, datetime.min.time()) if latest else None),
        "source": live.source if live else "seeded",
    }


def refresh_alerts_for_user(db: Session, user_id: int) -> list[Alert]:
    watches = db.scalars(select(Watch).where(Watch.user_id == user_id)).all()
    alerts: list[Alert] = []
    for w in watches:
        latest = latest_fused(db, w.city_id)
        if not latest:
            continue
        live = db.get(CityLive, w.city_id)
        current_aqi = live.aqi if live else latest.aqi
        if current_aqi >= w.aqi_threshold:
            city = db.get(City, w.city_id)
            msg = (
                f"{city.name} AQI {current_aqi} exceeded your watch threshold of {w.aqi_threshold}."
            )
            start_of_day = datetime.combine(date.today(), datetime.min.time())
            existing = db.scalar(
                select(Alert)
                .where(
                    Alert.user_id == user_id,
                    Alert.city_id == w.city_id,
                    Alert.created_at >= start_of_day,
                )
                .limit(1)
            )
            if not existing:
                alert = Alert(
                    user_id=user_id,
                    city_id=w.city_id,
                    message=msg,
                    current_aqi=current_aqi,
                    threshold=w.aqi_threshold,
                )
                db.add(alert)
                alerts.append(alert)
    db.commit()
    return alerts


POLLUTANT_MAP = {
    "pm25": "pm25",
    "pm10": "pm10",
    "no2": "no2",
    "so2": "so2",
    "co": "co",
    "o3": "o3",
}


def series_for_city(
    db: Session, city_id: int, days: int, pollutant: str
) -> list[tuple[date, float]]:
    col = POLLUTANT_MAP.get(pollutant.lower())
    if not col:
        raise ValueError("invalid pollutant")
    cutoff = date.today() - timedelta(days=days)
    rows = db.execute(
        select(FusedReading.date, getattr(FusedReading, col))
        .where(FusedReading.city_id == city_id, FusedReading.date >= cutoff)
        .order_by(FusedReading.date)
    ).all()
    return [(r[0], float(r[1])) for r in rows]
