"""NASA POWER daily minimum temperature of a point over the last complete years."""

import math
from dataclasses import dataclass

from ..climate import DAYS_IN_YEAR

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
YEARS = 10
PARAMETER = "T2M_MIN"
_LEAP_DAY = "0229"


@dataclass(frozen=True)
class DailyLows:
    """Daily minimum air temperature, °C, one list of DAYS_IN_YEAR values per year; NaN where missing."""

    years: tuple[int, ...]
    lows: tuple[tuple[float, ...], ...]


def query(latitude: float, longitude: float, last_year: int) -> dict[str, str]:
    return {
        "parameters": PARAMETER,
        "community": "AG",
        "latitude": f"{latitude:.4f}",
        "longitude": f"{longitude:.4f}",
        "start": f"{last_year - YEARS + 1}0101",
        "end": f"{last_year}1231",
        "format": "JSON",
    }


def parse(payload: dict) -> DailyLows:
    fill = payload.get("header", {}).get("fill_value", -999.0)
    series = payload["properties"]["parameter"][PARAMETER]
    by_year: dict[int, list[float]] = {}
    for key, value in sorted(series.items()):
        if key[4:] == _LEAP_DAY:
            continue
        by_year.setdefault(int(key[:4]), []).append(math.nan if value == fill else float(value))
    complete = {year: days for year, days in by_year.items() if len(days) == DAYS_IN_YEAR}
    if not complete:
        raise ValueError("NASA POWER returned no complete year of daily minimums")
    years = tuple(sorted(complete))
    return DailyLows(years=years, lows=tuple(tuple(complete[year]) for year in years))
