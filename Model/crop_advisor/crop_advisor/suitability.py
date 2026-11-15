"""Climate suitability of a crop at a point and the sowing window that follows from it.

The growing cycle is placed in the year by temperature: sowing starts when the
air reaches the temperature the crop germinates at, maturity comes when enough
growing degree days have accumulated. The temperature and the water available
during that cycle are then compared with what the crop needs, and the score is
limited by the scarcest factor (the FAO ECOCROP approach).
"""

from collections.abc import Sequence
from dataclasses import dataclass, replace
from math import inf, isnan
from typing import Literal

from .climate import DAYS_IN_YEAR, ClimateNormals
from .crops import Crop, Envelope
from .sources.power_daily import DailyLows

SOWING_WINDOW_DAYS = 21
DORMANCY_TEMPERATURE = 5.0
MAX_CYCLE_DAYS = 330
# Plant-available water a fully wet root zone holds, mm. Scales NASA root zone
# wetness (0-1) into the moisture a crop finds in the soil at sowing.
ROOT_ZONE_CAPACITY = 150.0
# Share of its water need a crop must find to survive, and to yield in full.
WATER_SUPPLY_FAILURE = 0.35
WATER_SUPPLY_FULL = 0.9
# Coldest-month means between which an autumn-sown crop goes from safe to lost.
WINTERKILL_SAFE = -8.0
WINTERKILL_LETHAL = -16.0
# Share of past years with a damaging frost at which a crop goes from unaffected to written off.
FROST_SAFE_SHARE = 0.1
FROST_LETHAL_SHARE = 0.5
SEEDLING_DAYS = 30
_RAIN_SEARCH_STEP = 5
_RAIN_SEARCH_DAYS = 120


@dataclass(frozen=True)
class SowingWindow:
    """Days of the year, 0 is January 1."""

    start_day: int
    end_day: int
    maturity_day: int


@dataclass(frozen=True)
class FrostRisk:
    """In how many of the observed years frost went below what the crop survives."""

    kind: Literal["seedling", "winter"]
    threshold: float
    years: int
    total: int

    @property
    def factor(self) -> float:
        return 1.0 - _ramp(self.years / self.total, FROST_SAFE_SHARE, FROST_LETHAL_SHARE)


@dataclass(frozen=True)
class Suitability:
    crop: Crop
    score: float
    temperature_score: float = 0.0
    water_score: float = 0.0
    ph_score: float | None = None
    sowing: SowingWindow | None = None
    # Mean temperature of the growing days and the water balance of the cycle.
    cycle_temperature: float | None = None
    cycle_rainfall: float | None = None
    # Rain plus the soil moisture found at sowing, as a share of the crop's water need.
    water_supply_ratio: float | None = None
    # Share of the thermal time the crop needs that the season provides.
    season_share: float = 1.0
    frost: FrostRisk | None = None
    limiting_factor: str | None = None

    @property
    def is_viable(self) -> bool:
        return self.score > 0


def envelope_score(value: float, envelope: Envelope) -> float:
    """1 inside the optimal range, falling linearly to 0 at the absolute limits."""
    low, optimal_low, optimal_high, high = envelope
    if value <= low or value >= high:
        return 0.0
    if value < optimal_low:
        return (value - low) / (optimal_low - low)
    if value > optimal_high:
        return (high - value) / (high - optimal_high)
    return 1.0


def _ramp(value: float, zero_at: float, one_at: float) -> float:
    return min(max((value - zero_at) / (one_at - zero_at), 0.0), 1.0)


def _first_day(start: int, matches) -> int | None:
    """First day at or after `start`, wrapping around the year, for which `matches(day)` holds."""
    for offset in range(DAYS_IN_YEAR):
        day = (start + offset) % DAYS_IN_YEAR
        if matches(day):
            return day
    return None


def _sowing_day(crop: Crop, climate: ClimateNormals) -> int | None:
    temperatures = climate.daily_temperature
    if crop.sowing == "autumn":
        warmest_day = max(range(DAYS_IN_YEAR), key=temperatures.__getitem__)
        if temperatures[warmest_day] <= crop.sowing_temperature:
            return None
        return _first_day(warmest_day, lambda day: temperatures[day] <= crop.sowing_temperature)

    coldest_day = min(range(DAYS_IN_YEAR), key=temperatures.__getitem__)
    if temperatures[coldest_day] < crop.sowing_temperature:
        return _first_day(coldest_day, lambda day: temperatures[day] >= crop.sowing_temperature)

    # Warm all year round: the rains decide, so the cycle goes where it catches most of them.
    rain = climate.daily_precipitation
    return max(
        range(0, DAYS_IN_YEAR, _RAIN_SEARCH_STEP),
        key=lambda day: sum(rain[(day + offset) % DAYS_IN_YEAR] for offset in range(_RAIN_SEARCH_DAYS)),
    )


def _grow(crop: Crop, climate: ClimateNormals, sowing_day: int) -> tuple[int, float]:
    """Runs the cycle from sowing; returns its length in days and the thermal time gathered."""
    temperatures = climate.daily_temperature
    gathered = 0.0
    for offset in range(MAX_CYCLE_DAYS):
        temperature = temperatures[(sowing_day + offset) % DAYS_IN_YEAR]
        cold_ends_season = crop.sowing == "spring" and offset > SOWING_WINDOW_DAYS
        if cold_ends_season and temperature < crop.base_temperature:
            return offset, gathered
        gathered += max(temperature - crop.base_temperature, 0.0)
        # A perennial stand keeps growing for as long as the season lasts.
        if gathered >= crop.thermal_time and not crop.perennial:
            return offset + 1, gathered
    return MAX_CYCLE_DAYS, gathered


def frost_risk(
    crop: Crop, climate: ClimateNormals, sowing_day: int, cycle: Sequence[int], lows: DailyLows
) -> FrostRisk:
    """Frost on seedlings in the first weeks after sowing, or on a dormant stand in winter for crops that overwinter."""
    if crop.winter_hardiness is not None:
        season = cycle if crop.sowing == "autumn" else range(DAYS_IN_YEAR)
        days = [day for day in season if climate.daily_temperature[day] < DORMANCY_TEMPERATURE]
        kind, threshold = "winter", crop.winter_hardiness
    else:
        days = [(sowing_day + offset) % DAYS_IN_YEAR for offset in range(SEEDLING_DAYS)]
        kind, threshold = "seedling", crop.frost_tolerance
    hit = sum(
        1 for year in lows.lows if min((year[day] for day in days if not isnan(year[day])), default=inf) < threshold
    )
    return FrostRisk(kind, threshold, hit, len(lows.years))


def _assess(crop: Crop, climate: ClimateNormals, irrigated: bool, lows: DailyLows | None) -> Suitability:
    sowing_day = _sowing_day(crop, climate)
    if sowing_day is None:
        # Never warm enough to sow in spring, or no cool season for an autumn-sown crop.
        return Suitability(crop, 0.0, limiting_factor="temperature" if crop.sowing == "spring" else "winter")

    cycle_days, gathered = _grow(crop, climate, sowing_day)
    cycle = [(sowing_day + offset) % DAYS_IN_YEAR for offset in range(cycle_days)]
    # An autumn-sown crop sits dormant through the cold, so only the days it grows on count.
    growth_threshold = max(crop.base_temperature, DORMANCY_TEMPERATURE) if crop.sowing == "autumn" \
        else crop.base_temperature
    growing = [climate.daily_temperature[day] for day in cycle
               if climate.daily_temperature[day] >= growth_threshold]
    if not growing:
        return Suitability(crop, 0.0, limiting_factor="temperature")

    cycle_temperature = sum(growing) / len(growing)
    rainfall = sum(climate.daily_precipitation[day] for day in cycle)
    soil_wetness = climate.daily_soil_wetness[sowing_day]
    stored = 0.0 if isnan(soil_wetness) else soil_wetness * ROOT_ZONE_CAPACITY
    supply_ratio = (rainfall + stored) / crop.water_need

    wet_limit, wet_failure = crop.excess_rainfall
    factors = {
        "temperature": envelope_score(cycle_temperature, crop.temperature),
        "water": 1.0 if irrigated else _ramp(supply_ratio, WATER_SUPPLY_FAILURE, WATER_SUPPLY_FULL),
        "excess_water": 1.0 - _ramp(rainfall, wet_limit, wet_failure),
        "season": min(gathered / crop.thermal_time, 1.0) ** 2,
    }
    if crop.sowing == "autumn":
        factors["winter"] = _ramp(climate.coldest_month_temperature, WINTERKILL_LETHAL, WINTERKILL_SAFE)
    frost = frost_risk(crop, climate, sowing_day, cycle, lows) if lows else None
    if frost:
        factors["frost"] = frost.factor

    limiting_factor = min(factors, key=factors.__getitem__)
    score = min(factors["temperature"], factors["water"], factors["excess_water"])
    score *= factors["season"] * factors.get("winter", 1.0) * factors.get("frost", 1.0)
    return Suitability(
        crop=crop,
        score=round(score, 3),
        temperature_score=round(factors["temperature"], 3),
        water_score=round(min(factors["water"], factors["excess_water"]), 3),
        sowing=SowingWindow(
            start_day=sowing_day,
            end_day=(sowing_day + SOWING_WINDOW_DAYS) % DAYS_IN_YEAR,
            maturity_day=(sowing_day + cycle_days) % DAYS_IN_YEAR,
        ),
        cycle_temperature=round(cycle_temperature, 1),
        cycle_rainfall=round(rainfall),
        water_supply_ratio=round(supply_ratio, 2),
        season_share=round(min(gathered / crop.thermal_time, 1.0), 2),
        frost=frost,
        limiting_factor=limiting_factor if factors[limiting_factor] < 1 else None,
    )


def assess(
    crop: Crop,
    climate: ClimateNormals,
    *,
    soil_ph: float | None = None,
    irrigated: bool = False,
    lows: DailyLows | None = None,
) -> Suitability:
    result = _assess(crop, climate, irrigated, lows)
    if soil_ph is None or not result.is_viable:
        return result

    ph_score = round(envelope_score(soil_ph, crop.ph), 3)
    if ph_score >= result.score:
        return replace(result, ph_score=ph_score)
    return replace(result, ph_score=ph_score, score=ph_score, limiting_factor="ph")
