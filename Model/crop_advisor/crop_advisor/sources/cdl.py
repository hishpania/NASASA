"""USDA Cropland Data Layer: which crop grew at a point of the contiguous US in a given year."""

import re

from ..geo import to_conus_albers

URL = "https://nassgeodata.gmu.edu/axis2/services/CDLService/GetCDLValue"

# Newest CDL year the CropScape service answers for. A year that is not published
# yet makes the service hang instead of failing, so it is not probed at runtime.
LATEST_YEAR = 2025

_VALUE = re.compile(r"value:\s*(\d+)")


def query(latitude: float, longitude: float, year: int) -> dict[str, str]:
    x, y = to_conus_albers(latitude, longitude)
    return {"year": str(year), "x": f"{x:.0f}", "y": f"{y:.0f}"}


def parse(body: str) -> int:
    """Returns the CDL class code, 0 when the pixel carries no data."""
    match = _VALUE.search(body)
    if not match:
        raise ValueError("Unexpected CropScape response")
    return int(match.group(1))
