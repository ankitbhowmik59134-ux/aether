from app.aqi import category_from_aqi, compute_aqi


def test_aqi_good_band():
    r = compute_aqi(20, 40, 20, 10, 0.5, 30)
    assert r.category == "Good"
    assert 0 <= r.aqi <= 50


def test_aqi_severe_band():
    r = compute_aqi(300, 500, 200, 400, 20, 200)
    assert r.category in ("Very Poor", "Severe")
    assert r.aqi >= 301


def test_category_from_aqi_labels():
    assert category_from_aqi(45) == "Good"
    assert category_from_aqi(75) == "Satisfactory"
    assert category_from_aqi(150) == "Moderate"
    assert category_from_aqi(250) == "Poor"
