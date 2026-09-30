from datetime import date, timedelta

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.aqi import compute_aqi
from app.auth import hash_password
from app.models import City, FusedReading, SourceReading, User, Watch

CITIES = [
    ("Delhi", "delhi", "Delhi", 28.6139, 77.2090, True),
    ("Mumbai", "mumbai", "Maharashtra", 19.0760, 72.8777, False),
    ("Bengaluru", "bengaluru", "Karnataka", 12.9716, 77.5946, False),
    ("Kolkata", "kolkata", "West Bengal", 22.5726, 88.3639, False),
    ("Chennai", "chennai", "Tamil Nadu", 13.0827, 80.2707, False),
    ("Hyderabad", "hyderabad", "Telangana", 17.3850, 78.4867, False),
    ("Pune", "pune", "Maharashtra", 18.5204, 73.8567, False),
    ("Jaipur", "jaipur", "Rajasthan", 26.9124, 75.7873, True),
    ("Lucknow", "lucknow", "Uttar Pradesh", 26.8467, 80.9462, True),
    ("Ahmedabad", "ahmedabad", "Gujarat", 23.0225, 72.5714, False),
    ("Chandigarh", "chandigarh", "Chandigarh", 30.7333, 76.7794, True),
    ("Kochi", "kochi", "Kerala", 9.9312, 76.2673, False),
]

DAYS = 400
RNG = np.random.default_rng(42)


def _season_factor(d: date, northern: bool) -> float:
    # Winter (Nov–Feb) worse in north; monsoon dip Jun–Sep for coastal
    month = d.month
    if northern and month in (11, 12, 1, 2):
        return 1.55
    if northern and month in (6, 7, 8, 9):
        return 0.85
    if not northern and month in (6, 7, 8, 9):
        return 0.75
    if month in (10, 11):
        return 1.15
    return 1.0


def _base_pollutants(city_idx: int, day_idx: int, northern: bool, d: date) -> dict[str, float]:
    trend = 0.02 * np.sin(day_idx / 30.0) + 0.01 * (day_idx / DAYS)
    base_pm25 = 45 + city_idx * 8 + trend * 20
    season = _season_factor(d, northern)
    noise = RNG.normal(0, 6)
    pm25 = max(8.0, base_pm25 * season + noise)
    pm10 = pm25 * (1.6 + RNG.uniform(-0.1, 0.1))
    no2 = max(5.0, 25 + city_idx * 2 + RNG.normal(0, 5))
    so2 = max(2.0, 12 + city_idx + RNG.normal(0, 3))
    co = max(0.3, 0.8 + city_idx * 0.05 + RNG.normal(0, 0.15))
    o3 = max(10.0, 35 + 15 * np.sin(day_idx / 45.0) + RNG.normal(0, 4))
    return {"pm25": pm25, "pm10": pm10, "no2": no2, "so2": so2, "co": co, "o3": o3}


def seed_catalog(db: Session) -> None:
    """Cities and the demo account only, so a host can start before live data arrives."""
    count = db.scalar(select(func.count()).select_from(City))
    if not count:
        db.add_all(
            [
                City(name=name, slug=slug, state=state, latitude=lat, longitude=lon, is_northern=northern)
                for name, slug, state, lat, lon, northern in CITIES
            ]
        )
        db.flush()
    if not db.scalar(select(User).where(User.email == "analyst@aether.dev")):
        analyst = User(email="analyst@aether.dev", password_hash=hash_password("Analyst@123"))
        db.add(analyst)
        db.flush()
        delhi = db.scalar(select(City).where(City.slug == "delhi"))
        if delhi:
            db.add(Watch(user_id=analyst.id, city_id=delhi.id, aqi_threshold=200))
    db.commit()


def seed_if_empty(db: Session) -> None:
    count = db.scalar(select(func.count()).select_from(City))
    if count and count > 0:
        return

    end = date.today()
    start = end - timedelta(days=DAYS - 1)

    city_rows: list[City] = []
    for idx, (name, slug, state, lat, lon, northern) in enumerate(CITIES):
        city_rows.append(
            City(
                name=name,
                slug=slug,
                state=state,
                latitude=lat,
                longitude=lon,
                is_northern=northern,
            )
        )
    db.add_all(city_rows)
    db.flush()

    for city_idx, city in enumerate(city_rows):
        for day_idx in range(DAYS):
            d = start + timedelta(days=day_idx)
            base = _base_pollutants(city_idx, day_idx, city.is_northern, d)
            ground_bias = RNG.uniform(-0.08, 0.08)
            sat_bias = RNG.uniform(-0.12, 0.12)

            def with_bias(b: dict[str, float], bias: float) -> dict[str, float]:
                return {k: max(1.0, v * (1 + bias)) for k, v in b.items()}

            ground = with_bias(base, ground_bias)
            satellite = with_bias(base, sat_bias)

            for source, vals in (("ground_monitor", ground), ("satellite_estimate", satellite)):
                db.add(
                    SourceReading(
                        city_id=city.id,
                        date=d,
                        source=source,
                        **vals,
                    )
                )

            fused = {k: (ground[k] * 0.65 + satellite[k] * 0.35) for k in base}
            aqi = compute_aqi(**fused)
            db.add(
                FusedReading(
                    city_id=city.id,
                    date=d,
                    pm25=fused["pm25"],
                    pm10=fused["pm10"],
                    no2=fused["no2"],
                    so2=fused["so2"],
                    co=fused["co"],
                    o3=fused["o3"],
                    aqi=aqi.aqi,
                    aqi_category=aqi.category,
                    dominant_pollutant=aqi.dominant,
                )
            )

    analyst = User(
        email="analyst@aether.dev",
        password_hash=hash_password("Analyst@123"),
    )
    db.add(analyst)
    db.flush()

    delhi = db.scalar(select(City).where(City.slug == "delhi"))
    if delhi:
        db.add(Watch(user_id=analyst.id, city_id=delhi.id, aqi_threshold=200))

    db.commit()
