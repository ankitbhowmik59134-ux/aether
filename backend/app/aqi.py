"""Indian AQI-style categories from sub-index values (PM2.5 primary for demo)."""

from dataclasses import dataclass


@dataclass
class AqiResult:
    aqi: int
    category: str
    dominant: str


# CPCB breakpoints for PM2.5 (µg/m³) -> sub-index
PM25_BREAKS = [
    (0, 30, 0, 50),
    (31, 60, 51, 100),
    (61, 90, 101, 200),
    (91, 120, 201, 300),
    (121, 250, 301, 400),
    (251, 500, 401, 500),
]

PM10_BREAKS = [
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 250, 101, 200),
    (251, 350, 201, 300),
    (351, 430, 301, 400),
    (431, 800, 401, 500),
]

NO2_BREAKS = [
    (0, 40, 0, 50),
    (41, 80, 51, 100),
    (81, 180, 101, 200),
    (181, 280, 201, 300),
    (281, 400, 301, 400),
    (401, 800, 401, 500),
]

SO2_BREAKS = [
    (0, 40, 0, 50),
    (41, 80, 51, 100),
    (81, 380, 101, 200),
    (381, 800, 201, 300),
    (801, 1600, 301, 400),
    (1601, 2000, 401, 500),
]

CO_BREAKS = [
    (0, 1.0, 0, 50),
    (1.1, 2.0, 51, 100),
    (2.1, 10, 101, 200),
    (10.1, 17, 201, 300),
    (17.1, 34, 301, 400),
    (34.1, 50, 401, 500),
]

O3_BREAKS = [
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 168, 101, 200),
    (169, 208, 201, 300),
    (209, 748, 301, 400),
    (749, 1000, 401, 500),
]

CATEGORY_LABELS = {
    (0, 50): "Good",
    (51, 100): "Satisfactory",
    (101, 200): "Moderate",
    (201, 300): "Poor",
    (301, 400): "Very Poor",
    (401, 500): "Severe",
}


def _sub_index(conc: float, breaks: list[tuple[float, float, int, int]]) -> int:
    for c_lo, c_hi, i_lo, i_hi in breaks:
        if c_lo <= conc <= c_hi:
            return int(round(i_lo + (i_hi - i_lo) * (conc - c_lo) / (c_hi - c_lo)))
    if conc > breaks[-1][1]:
        return 500
    return 0


def category_from_aqi(aqi: int) -> str:
    for (lo, hi), label in CATEGORY_LABELS.items():
        if lo <= aqi <= hi:
            return label
    return "Severe"


def compute_aqi(
    pm25: float, pm10: float, no2: float, so2: float, co: float, o3: float
) -> AqiResult:
    subs = {
        "pm25": _sub_index(pm25, PM25_BREAKS),
        "pm10": _sub_index(pm10, PM10_BREAKS),
        "no2": _sub_index(no2, NO2_BREAKS),
        "so2": _sub_index(so2, SO2_BREAKS),
        "co": _sub_index(co, CO_BREAKS),
        "o3": _sub_index(o3, O3_BREAKS),
    }
    dominant = max(subs, key=subs.get)
    aqi = subs[dominant]
    return AqiResult(aqi=aqi, category=category_from_aqi(aqi), dominant=dominant)
