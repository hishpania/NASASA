"""Monthly climate normals of a point and the agro-climatic indicators derived from them."""

import calendar
from dataclasses import dataclass
from functools import cached_property

# Normals describe an average year, so a common (non-leap) year stands in for it.
_REFERENCE_YEAR = 2001
MONTHS = range(1, 13)
DAYS_IN_MONTH = tuple(calendar.monthrange(_REFERENCE_YEAR, month)[1] for month in MONTHS)
DAYS_IN_YEAR = sum(DAYS_IN_MONTH)
MONTHS_IN_YEAR = len(DAYS_IN_MONTH)
_MID_MONTH_DAY = tuple(sum(DAYS_IN_MONTH[:month]) + DAYS_IN_MONTH[month] / 2 for month in range(MONTHS_IN_YEAR))

GDD_BASE = 10.0
GROWING_TEMPERATURE = 5.0
SEASON_LENGTH_MONTHS = MONTHS_IN_YEAR // 2

Monthly = tuple[float, ...]


def daily_from_monthly(values: Monthly) -> list[float]:
    """Spreads twelve monthly means over the days of a year by linear interpolation between mid-months."""
    days: list[float] = []
    for day in range(DAYS_IN_YEAR):
        position = day + 0.5
        # The mid-months that bracket the day; before mid-January and after mid-December the year wraps around.
        after = next((month for month in range(MONTHS_IN_YEAR) if _MID_MONTH_DAY[month] > position), 0)
        before = (after - 1) % MONTHS_IN_YEAR
        start, end = _MID_MONTH_DAY[before], _MID_MONTH_DAY[after]
        if before > after:
            if position < end:
                start -= DAYS_IN_YEAR
            else:
                end += DAYS_IN_YEAR
        share = (position - start) / (end - start)
        days.append(values[before] + (values[after] - values[before]) * share)
    return days


@dataclass(frozen=True)
class ClimateNormals:
    """Long-term monthly means, January first."""

    latitude: float
    longitude: float
    elevation: float | None
    temperature: Monthly  # °C, mean
    temperature_extreme_min: Monthly  # °C, coldest value on record for the month
    precipitation: Monthly  # mm per day
    soil_wetness: Monthly  # root zone, 0-1
    humidity: Monthly  # %
    solar_radiation: Monthly  # MJ/m² per day

    @cached_property
    def daily_temperature(self) -> list[float]:
        return daily_from_monthly(self.temperature)

    @cached_property
    def daily_precipitation(self) -> list[float]:
        return daily_from_monthly(self.precipitation)

    @cached_property
    def daily_soil_wetness(self) -> list[float]:
        return daily_from_monthly(self.soil_wetness)

    @cached_property
    def warm_season(self) -> tuple[int, ...]:
        """Indices of the six consecutive warmest months, so both hemispheres read the same way."""
        def warmth(start: int) -> float:
            return sum(self.temperature[(start + offset) % MONTHS_IN_YEAR] for offset in range(SEASON_LENGTH_MONTHS))

        start = max(range(MONTHS_IN_YEAR), key=warmth)
        return tuple((start + offset) % MONTHS_IN_YEAR for offset in range(SEASON_LENGTH_MONTHS))

    def _season_mean(self, values: Monthly) -> float:
        return sum(values[month] for month in self.warm_season) / SEASON_LENGTH_MONTHS

    @property
    def growing_degree_days(self) -> float:
        return sum(max(temperature - GDD_BASE, 0.0) for temperature in self.daily_temperature)

    @property
    def growing_days(self) -> int:
        return sum(1 for temperature in self.daily_temperature if temperature >= GROWING_TEMPERATURE)

    @property
    def annual_precipitation(self) -> float:
        return sum(rate * days for rate, days in zip(self.precipitation, DAYS_IN_MONTH))

    @property
    def season_precipitation(self) -> float:
        return sum(self.precipitation[month] * DAYS_IN_MONTH[month] for month in self.warm_season)

    @property
    def season_temperature(self) -> float:
        return self._season_mean(self.temperature)

    @property
    def season_soil_wetness(self) -> float:
        return self._season_mean(self.soil_wetness)

    @property
    def season_humidity(self) -> float:
        return self._season_mean(self.humidity)

    @property
    def season_solar_radiation(self) -> float:
        return self._season_mean(self.solar_radiation)

    @property
    def warmest_month_temperature(self) -> float:
        return max(self.temperature)

    @property
    def coldest_month_temperature(self) -> float:
        return min(self.temperature)

    @property
    def record_low(self) -> float:
        return min(self.temperature_extreme_min)

    def features(self) -> dict[str, float]:
        """Numeric description of the climate used by the crop model."""
        return {
            "growing_degree_days": round(self.growing_degree_days, 1),
            "growing_days": float(self.growing_days),
            "season_temperature": round(self.season_temperature, 2),
            "warmest_month_temperature": round(self.warmest_month_temperature, 2),
            "coldest_month_temperature": round(self.coldest_month_temperature, 2),
            "record_low": round(self.record_low, 2),
            "annual_precipitation": round(self.annual_precipitation, 1),
            "season_precipitation": round(self.season_precipitation, 1),
            "season_soil_wetness": round(self.season_soil_wetness, 3),
            "season_humidity": round(self.season_humidity, 1),
            "season_solar_radiation": round(self.season_solar_radiation, 2),
            "elevation": round(self.elevation, 1) if self.elevation is not None else float("nan"),
        }


CLIMATE_FEATURES: tuple[str, ...] = (
    "growing_degree_days",
    "growing_days",
    "season_temperature",
    "warmest_month_temperature",
    "coldest_month_temperature",
    "record_low",
    "annual_precipitation",
    "season_precipitation",
    "season_soil_wetness",
    "season_humidity",
    "season_solar_radiation",
    "elevation",
)
