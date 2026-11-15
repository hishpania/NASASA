"""NASA POWER monthly time series of a point."""

import math
from dataclasses import dataclass

URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
FIRST_YEAR = 2001
PARAMETERS = ("T2M", "PRECTOTCORR", "GWETROOT")

Month = tuple[int, int]


@dataclass(frozen=True)
class MonthlySeries:
    latitude: float
    longitude: float
    months: tuple[Month, ...]
    values: dict[str, tuple[float, ...]]


def query(latitude: float, longitude: float, last_year: int) -> dict[str, str]:
    return {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "latitude": f"{latitude:.4f}",
        "longitude": f"{longitude:.4f}",
        "start": str(FIRST_YEAR),
        "end": str(last_year),
        "format": "JSON",
    }


def _fill_gaps(values: list[float]) -> list[float]:
    known = [index for index, value in enumerate(values) if not math.isnan(value)]
    if not known:
        raise ValueError("NASA POWER monthly series is empty")
    filled = list(values)
    for index, value in enumerate(values):
        if not math.isnan(value):
            continue
        before = max((k for k in known if k < index), default=None)
        after = min((k for k in known if k > index), default=None)
        if before is None or after is None:
            filled[index] = values[before if after is None else after]
        else:
            share = (index - before) / (after - before)
            filled[index] = values[before] + (values[after] - values[before]) * share
    return filled


def parse(payload: dict) -> MonthlySeries:
    fill = payload.get("header", {}).get("fill_value", -999.0)
    parameters = payload["properties"]["parameter"]
    keys = sorted(key for key in parameters[PARAMETERS[0]] if not key.endswith("13"))

    def read(name: str, key: str) -> float:
        value = parameters[name].get(key, fill)
        return math.nan if value == fill else float(value)

    complete = [key for key in keys if all(not math.isnan(read(name, key)) for name in PARAMETERS)]
    if not complete:
        raise ValueError("NASA POWER returned no monthly data for this point")
    observed = [key for key in keys if key <= complete[-1]]
    longitude, latitude, *_ = payload["geometry"]["coordinates"]
    return MonthlySeries(
        latitude=latitude,
        longitude=longitude,
        months=tuple((int(key[:4]), int(key[4:])) for key in observed),
        values={name: tuple(_fill_gaps([read(name, key) for key in observed])) for name in PARAMETERS},
    )
