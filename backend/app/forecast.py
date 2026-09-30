from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FusedReading


@dataclass
class ForecastPoint:
    date: date
    pm25: float
    lower: float
    upper: float


@dataclass
class ForecastResult:
    method: str
    horizon: int
    points: list[ForecastPoint]


def _moving_average_forecast(series: pd.Series, horizon: int, window: int = 14) -> ForecastResult:
    last_ts = series.index[-1]
    ma = float(series.tail(window).mean())
    std = float(series.tail(window).std() or 5.0)
    points: list[ForecastPoint] = []
    for h in range(1, horizon + 1):
        d = (last_ts + pd.Timedelta(days=h)).date()
        spread = 1.96 * std * (1 + 0.1 * h)
        points.append(
            ForecastPoint(date=d, pm25=ma, lower=max(0, ma - spread), upper=ma + spread)
        )
    return ForecastResult(method="moving_average", horizon=horizon, points=points)


def _load_pm25_series(db: Session, city_id: int, days: int = 365) -> pd.Series:
    rows = db.execute(
        select(FusedReading.date, FusedReading.pm25)
        .where(FusedReading.city_id == city_id)
        .order_by(FusedReading.date.desc())
        .limit(days)
    ).all()
    if not rows:
        return pd.Series(dtype=float)
    rows = list(reversed(rows))
    dates = [r[0] for r in rows]
    values = [float(r[1]) for r in rows]
    return pd.Series(values, index=pd.DatetimeIndex(dates))


_FORECAST_CACHE: dict[tuple, ForecastResult] = {}


def clear_forecast_cache() -> None:
    _FORECAST_CACHE.clear()


def get_forecast(db: Session, city_id: int, horizon: int = 7) -> ForecastResult:
    series = _load_pm25_series(db, city_id, days=180)
    if len(series) < 60:
        if len(series) == 0:
            return ForecastResult(method="moving_average", horizon=horizon, points=[])
        return _moving_average_forecast(series, horizon)

    last_day = str(series.index[-1].date())
    cache_key = (city_id, last_day, horizon)
    cached = _FORECAST_CACHE.get(cache_key)
    if cached:
        return cached

    try:
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        train = series.astype(float).asfreq("D")
        model = SARIMAX(
            train,
            order=(1, 1, 1),
            seasonal_order=(1, 0, 1, 7),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        fit = model.fit(disp=False, maxiter=50)
        pred = fit.get_forecast(steps=horizon)
        mean = pred.predicted_mean
        conf = pred.conf_int(alpha=0.05)
        last_d = train.index[-1]
        points: list[ForecastPoint] = []
        for i in range(horizon):
            d = (last_d + pd.Timedelta(days=i + 1)).date()
            m = float(mean.iloc[i])
            lo = float(conf.iloc[i, 0])
            hi = float(conf.iloc[i, 1])
            points.append(
                ForecastPoint(date=d, pm25=max(0, m), lower=max(0, lo), upper=max(0, hi))
            )
        result = ForecastResult(method="sarimax", horizon=horizon, points=points)
        _FORECAST_CACHE[cache_key] = result
        return result
    except Exception:
        result = _moving_average_forecast(series, horizon)
        _FORECAST_CACHE[cache_key] = result
        return result


def forecast_to_dict(result: ForecastResult) -> dict[str, Any]:
    return {
        "method": result.method,
        "horizon": result.horizon,
        "points": [
            {
                "date": p.date.isoformat(),
                "pm25": round(p.pm25, 2),
                "lower": round(p.lower, 2),
                "upper": round(p.upper, 2),
            }
            for p in result.points
        ],
    }
