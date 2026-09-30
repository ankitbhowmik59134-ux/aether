import pandas as pd

from app.forecast import _moving_average_forecast, forecast_to_dict


def test_moving_average_forecast_shape():
    index = pd.date_range("2026-01-01", periods=30, freq="D")
    series = pd.Series([40.0] * 30, index=index)
    result = _moving_average_forecast(series, 7)
    payload = forecast_to_dict(result)
    assert payload["method"] == "moving_average"
    assert payload["horizon"] == 7
    assert len(payload["points"]) == 7
    point = payload["points"][0]
    assert point["lower"] <= point["pm25"] <= point["upper"]
