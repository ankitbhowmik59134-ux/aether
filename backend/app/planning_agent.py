from dataclasses import dataclass
from typing import Any

from app.aqi import compute_aqi
from app.forecast import ForecastResult


@dataclass
class PlanSection:
    title: str
    body: str


@dataclass
class ActivityPlan:
    tier: str
    summary: str
    sections: list[PlanSection]
    forecast_method: str
    horizon_days: int


class PlanningAgent:
    """Rules + forecast agent — not an LLM."""

    def build(
        self,
        city_name: str,
        latest_pm25: float,
        latest_category: str,
        dominant: str,
        forecast: ForecastResult,
        authenticated: bool,
    ) -> ActivityPlan:
        avg_fc = (
            sum(p.pm25 for p in forecast.points) / len(forecast.points)
            if forecast.points
            else latest_pm25
        )
        trend = "worsening" if avg_fc > latest_pm25 * 1.05 else (
            "improving" if avg_fc < latest_pm25 * 0.95 else "stable"
        )
        fc_aqi = compute_aqi(avg_fc, avg_fc * 1.6, 40, 15, 1.0, 35)

        summary = (
            f"{city_name}: air is {latest_category.lower()} ({dominant} leading). "
            f"Next week looks {trend} (avg PM2.5 ~{avg_fc:.0f} µg/m³)."
        )

        if not authenticated:
            return ActivityPlan(
                tier="guest",
                summary=summary,
                sections=[],
                forecast_method=forecast.method,
                horizon_days=forecast.horizon,
            )

        outdoor = self._outdoor_rules(latest_category, trend, fc_aqi.category)
        masks = self._mask_rules(latest_category, dominant)
        windows = self._window_rules(latest_category, trend)
        sensitive = self._sensitive_rules(latest_category, dominant)

        sections = [
            PlanSection("7-day outlook", self._outlook_paragraph(forecast, trend, forecast.method)),
            PlanSection("Outdoor exercise", outdoor),
            PlanSection("Masks & commute", masks),
            PlanSection("Home ventilation", windows),
            PlanSection("Who should take extra care", sensitive),
        ]
        return ActivityPlan(
            tier="full",
            summary=summary,
            sections=sections,
            forecast_method=forecast.method,
            horizon_days=forecast.horizon,
        )

    def _outlook_paragraph(self, forecast: ForecastResult, trend: str, method: str) -> str:
        lines = [
            f"Forecast uses {method.upper()} on recent PM2.5; interval shows uncertainty.",
            f"Overall trend: {trend} over {forecast.horizon} days.",
        ]
        for p in forecast.points[:3]:
            lines.append(f"• {p.date.isoformat()}: ~{p.pm25:.0f} µg/m³ ({p.lower:.0f}–{p.upper:.0f})")
        if len(forecast.points) > 3:
            lines.append(f"• … plus {len(forecast.points) - 3} more days in the app chart.")
        return " ".join(lines)

    def _outdoor_rules(self, cat: str, trend: str, fc_cat: str) -> str:
        if cat in ("Good", "Satisfactory"):
            return "Morning walks and outdoor sports are generally fine; avoid main roads at rush hour."
        if cat == "Moderate":
            return "Prefer evening walks; shorten intense workouts if you feel irritation; consider parks away from traffic."
        if trend == "worsening" or fc_cat in ("Poor", "Very Poor", "Severe"):
            return "Limit outdoor exercise to 30 minutes; move workouts indoors; no vigorous play for children."
        return "Outdoor activity only if necessary; use green routes; skip jogging until AQI improves."

    def _mask_rules(self, cat: str, dominant: str) -> str:
        if cat in ("Good", "Satisfactory"):
            return "Masks optional for most; carry one if sensitive to dust (PM10)."
        if cat == "Moderate":
            return "N95 or equivalent on two-wheelers and near construction; cloth masks are not enough for PM2.5."
        return (
            f"Wear N95/FFP2 when outside; dominant pollutant is {dominant}. "
            "Replace filters when breathing resistance increases."
        )

    def _window_rules(self, cat: str, trend: str) -> str:
        if cat in ("Good", "Satisfactory"):
            return "Open windows mid-morning for ventilation; use exhaust fans while cooking."
        if cat in ("Moderate", "Poor"):
            return "Ventilate when AQI dips (often afternoon); keep windows closed during peak traffic."
        return "Keep windows closed; use AC on recirculate or a HEPA purifier; avoid indoor smoking/incense."

    def _sensitive_rules(self, cat: str, dominant: str) -> str:
        base = "Children, older adults, and people with asthma/COPD or heart disease should track symptoms daily."
        if cat in ("Very Poor", "Severe"):
            return base + f" With {dominant} elevated, avoid outdoor errands; keep rescue inhalers accessible."
        if cat in ("Poor", "Moderate"):
            return base + " Reduce exposure during morning and evening peaks."
        return base + " No special restrictions beyond usual care unless symptoms flare."


def plan_to_dict(plan: ActivityPlan) -> dict[str, Any]:
    return {
        "tier": plan.tier,
        "summary": plan.summary,
        "forecast_method": plan.forecast_method,
        "horizon_days": plan.horizon_days,
        "sections": [{"title": s.title, "body": s.body} for s in plan.sections],
    }
