from datetime import date

from app.forecast import ForecastPoint, ForecastResult
from app.planning_agent import PlanningAgent


def _forecast() -> ForecastResult:
    return ForecastResult(
        method="moving_average",
        horizon=7,
        points=[ForecastPoint(date=date(2026, 1, 1), pm25=80, lower=60, upper=100)],
    )


def test_guest_plan_is_summary_only():
    plan = PlanningAgent().build("Delhi", 90, "Moderate", "pm25", _forecast(), False)
    assert plan.tier == "guest"
    assert plan.sections == []
    assert "Delhi" in plan.summary


def test_full_plan_has_action_sections():
    plan = PlanningAgent().build("Delhi", 90, "Moderate", "pm25", _forecast(), True)
    assert plan.tier == "full"
    assert len(plan.sections) >= 4
    titles = {section.title for section in plan.sections}
    assert "Outdoor exercise" in titles
    assert "Masks & commute" in titles
