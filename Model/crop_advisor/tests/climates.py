"""Synthetic climates for tests, shaped like the places they are named after."""

from crop_advisor.climate import ClimateNormals


def make(temperature, precipitation, soil_wetness=0.6, coldest_on_record=-30.0) -> ClimateNormals:
    return ClimateNormals(
        latitude=0.0,
        longitude=0.0,
        elevation=300.0,
        temperature=tuple(temperature),
        temperature_extreme_min=tuple(value + coldest_on_record / 3 for value in temperature),
        precipitation=tuple(precipitation),
        soil_wetness=(soil_wetness,) * 12,
        humidity=(70.0,) * 12,
        solar_radiation=(15.0,) * 12,
    )


# Humid continental: cold winter, warm wet summer.
CORN_BELT = make(
    temperature=(-6, -4, 3, 10, 16, 21, 23, 22, 18, 11, 3, -4),
    precipitation=(0.8, 0.9, 1.7, 3.0, 4.2, 4.5, 3.9, 3.8, 3.0, 2.3, 1.6, 1.0),
)
# Semi-arid plains: same warmth, a third of the rain.
DRY_PLAINS = make(
    temperature=(0, 2, 7, 12, 17, 23, 26, 25, 20, 13, 6, 1),
    precipitation=(0.3, 0.4, 0.8, 1.3, 2.2, 2.4, 2.3, 1.9, 1.2, 1.0, 0.5, 0.3),
    soil_wetness=0.4,
)
# Wet tropics: no winter at all.
TROPICS = make(
    temperature=(25, 25, 25, 24, 22, 21, 21, 22, 24, 25, 25, 25),
    precipitation=(7.5, 6.5, 5.0, 2.5, 1.5, 1.0, 0.7, 0.8, 2.0, 4.0, 5.0, 7.0),
)
# The corn belt mirrored into the southern hemisphere.
SOUTHERN = make(
    temperature=CORN_BELT.temperature[6:] + CORN_BELT.temperature[:6],
    precipitation=CORN_BELT.precipitation[6:] + CORN_BELT.precipitation[:6],
)
