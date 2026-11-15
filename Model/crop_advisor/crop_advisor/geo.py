"""Geographic helpers: US coverage test and the projection used by the Cropland Data Layer."""

import math

# Rough outline of the contiguous United States, (longitude, latitude) pairs.
# It only has to keep requests for obviously foreign points away from the CDL
# service; points near the border are settled by the service itself.
_CONUS_OUTLINE = (
    (-124.8, 48.4), (-123.2, 48.3), (-123.0, 49.0), (-95.2, 49.0), (-94.6, 48.7),
    (-89.6, 48.0), (-88.4, 48.3), (-84.9, 46.9), (-83.4, 45.9), (-82.5, 45.3),
    (-82.4, 43.0), (-83.1, 42.1), (-79.0, 42.8), (-79.2, 43.5), (-76.8, 43.6),
    (-75.0, 45.0), (-71.5, 45.0), (-70.3, 45.9), (-69.2, 47.5), (-68.2, 47.4),
    (-67.8, 45.7), (-66.9, 44.8), (-70.0, 43.5), (-69.9, 41.5), (-73.7, 40.5),
    (-75.0, 38.4), (-75.4, 35.2), (-77.9, 33.8), (-81.0, 31.5), (-80.0, 26.8),
    (-80.3, 25.1), (-81.8, 24.5), (-82.9, 27.8), (-84.0, 30.0), (-88.9, 30.1),
    (-89.2, 29.0), (-93.8, 29.6), (-97.1, 27.7), (-97.1, 25.9), (-99.2, 26.4),
    (-101.4, 29.7), (-103.1, 28.9), (-104.5, 29.6), (-106.5, 31.7), (-108.2, 31.3),
    (-111.1, 31.3), (-114.8, 32.5), (-117.1, 32.5), (-118.5, 34.0), (-120.6, 34.5),
    (-122.5, 37.5), (-124.4, 40.4), (-124.6, 42.8), (-124.0, 46.2), (-124.8, 48.4),
)

# NAD83 / Conus Albers (EPSG:5070) on the GRS80 ellipsoid.
_A = 6378137.0
_F = 1 / 298.257222101
_E2 = 2 * _F - _F * _F
_E = math.sqrt(_E2)
_LAT_1 = math.radians(29.5)
_LAT_2 = math.radians(45.5)
_LAT_0 = math.radians(23.0)
_LON_0 = math.radians(-96.0)


def _q(lat: float) -> float:
    sin_lat = math.sin(lat)
    return (1 - _E2) * (
        sin_lat / (1 - _E2 * sin_lat * sin_lat)
        - (1 / (2 * _E)) * math.log((1 - _E * sin_lat) / (1 + _E * sin_lat))
    )


def _m(lat: float) -> float:
    sin_lat = math.sin(lat)
    return math.cos(lat) / math.sqrt(1 - _E2 * sin_lat * sin_lat)


_N = (_m(_LAT_1) ** 2 - _m(_LAT_2) ** 2) / (_q(_LAT_2) - _q(_LAT_1))
_C = _m(_LAT_1) ** 2 + _N * _q(_LAT_1)
_RHO_0 = _A * math.sqrt(_C - _N * _q(_LAT_0)) / _N


def to_conus_albers(latitude: float, longitude: float) -> tuple[float, float]:
    """Projects WGS84 degrees to EPSG:5070 meters, the grid CDL is published on."""
    rho = _A * math.sqrt(_C - _N * _q(math.radians(latitude))) / _N
    theta = _N * (math.radians(longitude) - _LON_0)
    return rho * math.sin(theta), _RHO_0 - rho * math.cos(theta)


def is_in_conus(latitude: float, longitude: float) -> bool:
    """Ray casting against the simplified outline of the contiguous United States."""
    inside = False
    previous_lon, previous_lat = _CONUS_OUTLINE[-1]
    for lon, lat in _CONUS_OUTLINE:
        if (lat > latitude) != (previous_lat > latitude):
            crossing = (previous_lon - lon) * (latitude - lat) / (previous_lat - lat) + lon
            if longitude < crossing:
                inside = not inside
        previous_lon, previous_lat = lon, lat
    return inside
