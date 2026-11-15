"""USDA SSURGO soil survey through Soil Data Access: properties of the topsoil at a US point."""

from dataclasses import dataclass

URL = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"

_QUERY = """
SELECT TOP 1 mu.muname, c.drainagecl, ch.ph1to1h2o_r, ch.om_r, ch.claytotal_r, ch.sandtotal_r
FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({longitude:.6f} {latitude:.6f})') k
JOIN mapunit mu ON mu.mukey = k.mukey
JOIN component c ON c.mukey = mu.mukey AND c.majcompflag = 'Yes'
JOIN chorizon ch ON ch.cokey = c.cokey AND ch.hzdept_r = 0
ORDER BY c.comppct_r DESC
"""


@dataclass(frozen=True)
class Soil:
    name: str
    drainage: str | None
    ph: float | None
    organic_matter: float | None  # % of the topsoil by weight
    clay: float | None  # %
    sand: float | None  # %


def request_body(latitude: float, longitude: float) -> dict[str, str]:
    return {"query": _QUERY.format(latitude=latitude, longitude=longitude), "format": "JSON"}


def _number(value: str | None) -> float | None:
    return float(value) if value not in (None, "") else None


def parse(payload: dict) -> Soil | None:
    rows = payload.get("Table") or []
    if not rows:
        return None
    name, drainage, ph, organic_matter, clay, sand = rows[0]
    return Soil(
        name=name,
        drainage=drainage or None,
        ph=_number(ph),
        organic_matter=_number(organic_matter),
        clay=_number(clay),
        sand=_number(sand),
    )
