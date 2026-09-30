from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.forecast import forecast_to_dict, get_forecast
from app.models import City, CityLive, User
from app.pdf_report import build_city_report_pdf
from app.planning_agent import PlanningAgent, plan_to_dict
from app.schemas import CityDetail, CitySummary, SeriesPoint
from app.services import city_summary, latest_fused, series_for_city

router = APIRouter(prefix="/api", tags=["cities"])
planner = PlanningAgent()


@router.get("/cities", response_model=list[CitySummary])
def list_cities(db: Annotated[Session, Depends(get_db)]):
    cities = db.scalars(select(City).order_by(City.name)).all()
    return [city_summary(db, c) for c in cities]


@router.get("/cities/{city_id}", response_model=CityDetail)
def get_city(city_id: int, db: Annotated[Session, Depends(get_db)]):
    city = db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    summary = city_summary(db, city)
    live = db.get(CityLive, city_id)
    latest = latest_fused(db, city_id)
    reading = live or latest
    pollutants = None
    latest_date = None
    if reading:
        latest_date = live.observed_at.date() if live else latest.date
        pollutants = {
            "pm25": reading.pm25,
            "pm10": reading.pm10,
            "no2": reading.no2,
            "so2": reading.so2,
            "co": reading.co,
            "o3": reading.o3,
        }
    return CityDetail(**summary, latest_date=latest_date, pollutants=pollutants)


@router.get("/cities/{city_id}/series")
def city_series(
    city_id: int,
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(90, ge=7, le=400),
    pollutant: str = Query("pm25"),
):
    if not db.get(City, city_id):
        raise HTTPException(status_code=404, detail="City not found")
    try:
        rows = series_for_city(db, city_id, days, pollutant)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pollutant")
    return {
        "city_id": city_id,
        "pollutant": pollutant.lower(),
        "days": days,
        "points": [SeriesPoint(date=d, value=round(v, 2)) for d, v in rows],
    }


@router.get("/cities/{city_id}/forecast")
def city_forecast(
    city_id: int,
    db: Annotated[Session, Depends(get_db)],
    horizon: int = Query(7, ge=1, le=14),
):
    if not db.get(City, city_id):
        raise HTTPException(status_code=404, detail="City not found")
    return forecast_to_dict(get_forecast(db, city_id, horizon))


@router.get("/cities/{city_id}/plan")
def city_plan(
    city_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    city = db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    latest = latest_fused(db, city_id)
    if not latest:
        raise HTTPException(status_code=404, detail="No readings for city")
    fc = get_forecast(db, city_id, 7)
    plan = planner.build(
        city.name,
        latest.pm25,
        latest.aqi_category,
        latest.dominant_pollutant,
        fc,
        authenticated=user is not None,
    )
    return plan_to_dict(plan)


@router.get("/cities/{city_id}/report.pdf")
def city_report_pdf(
    city_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    city = db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    latest = latest_fused(db, city_id)
    if not latest:
        raise HTTPException(status_code=404, detail="No readings")
    fc = get_forecast(db, city_id, 7)
    plan = planner.build(
        city.name,
        latest.pm25,
        latest.aqi_category,
        latest.dominant_pollutant,
        fc,
        authenticated=True,
    )
    pdf = build_city_report_pdf(
        city.name,
        city.state,
        latest.aqi,
        latest.aqi_category,
        latest.pm25,
        fc.method,
        plan,
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="aether-{city.slug}-report.pdf"'},
    )


@router.get("/compare")
def compare_cities(
    db: Annotated[Session, Depends(get_db)],
    left: int = Query(...),
    right: int = Query(...),
    days: int = Query(90, ge=7, le=400),
    pollutant: str = Query("pm25"),
):
    for cid in (left, right):
        if not db.get(City, cid):
            raise HTTPException(status_code=404, detail=f"City {cid} not found")
    try:
        left_series = series_for_city(db, left, days, pollutant)
        right_series = series_for_city(db, right, days, pollutant)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pollutant")
    return {
        "left": left,
        "right": right,
        "pollutant": pollutant,
        "days": days,
        "left_points": [{"date": d.isoformat(), "value": v} for d, v in left_series],
        "right_points": [{"date": d.isoformat(), "value": v} for d, v in right_series],
    }
