"""NASA POWER climatology: 25-year monthly normals for a point."""

import calendar

from ..climate import MONTHS, ClimateNormals, Monthly

URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

# POWER keys monthly normals by upper-case English month abbreviations: JAN ... DEC.
_MONTH_KEYS = tuple(calendar.month_abbr[month].upper() for month in MONTHS)
_PARAMETERS = ("T2M", "T2M_MIN", "PRECTOTCORR", "GWETROOT", "RH2M", "ALLSKY_SFC_SW_DWN")
_REQUIRED = ("T2M", "PRECTOTCORR")


class ClimateUnavailable(Exception):
    """NASA POWER has no usable normals for the requested point."""


def query(latitude: float, longitude: float) -> dict[str, str]:
    return {
        "parameters": ",".join(_PARAMETERS),
        "community": "AG",
        "latitude": f"{latitude:.4f}",
        "longitude": f"{longitude:.4f}",
        "format": "JSON",
    }


def parse(payload: dict) -> ClimateNormals:
    fill = payload.get("header", {}).get("fill_value", -999.0)
    parameters = payload.get("properties", {}).get("parameter", {})

    def monthly(name: str) -> Monthly:
        series = parameters.get(name, {})
        values = tuple(series.get(month, fill) for month in _MONTH_KEYS)
        if name in _REQUIRED and any(value == fill for value in values):
            raise ClimateUnavailable(f"NASA POWER returned no {name} normals for this point")
        return tuple(float("nan") if value == fill else float(value) for value in values)

    longitude, latitude, *rest = payload["geometry"]["coordinates"]
    elevation = rest[0] if rest and rest[0] != fill else None
    return ClimateNormals(
        latitude=latitude,
        longitude=longitude,
        elevation=elevation,
        temperature=monthly("T2M"),
        temperature_extreme_min=monthly("T2M_MIN"),
        precipitation=monthly("PRECTOTCORR"),
        soil_wetness=monthly("GWETROOT"),
        humidity=monthly("RH2M"),
        solar_radiation=monthly("ALLSKY_SFC_SW_DWN"),
    )
