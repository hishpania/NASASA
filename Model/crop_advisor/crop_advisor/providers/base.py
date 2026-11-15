"""What every recommendation provider shares: the request, the contract and the advice assembly."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from math import isnan
from typing import Protocol

from .. import schemas, strategies
from ..climate import ClimateNormals
from ..crops import CROPS, FALLOW, LAND_USE_NAMES
from ..explain import describe
from ..rotation import rotation_effect
from ..sources.power_daily import DailyLows
from ..sources.soil import Soil
from ..suitability import SowingWindow, Suitability, assess

MAX_RECOMMENDATIONS = 6
_REFERENCE_NEW_YEAR = date(2001, 1, 1)

CLIMATE_SOURCE = "NASA POWER climatology, 2001–2025 monthly normals"
NO_FROST_GAP = "NASA POWER daily minimums did not answer, so frost after sowing and in winter is not checked."

COMMON_GAPS = (
    "Climate is described by 2001–2025 normals from NASA POWER, not by a forecast for the coming season.",
    "Markets, equipment, contracts and labour are not considered.",
    "Scores rank options against each other; a local agronomist should confirm the choice and the variety.",
)


class OutOfCoverage(Exception):
    """The provider has no data for this point; the next provider should answer."""


@dataclass(frozen=True)
class AdviceRequest:
    latitude: float
    longitude: float
    # What the user says grew here, most recent season first, ahead of observed history.
    previous_crops: tuple[str, ...] = ()
    irrigated: bool = False


@dataclass(frozen=True)
class Season:
    land_use: str
    year: int | None = None
    origin: str = "observed"


class Provider(Protocol):
    info: schemas.ProviderInfo

    def covers(self, latitude: float, longitude: float) -> bool: ...

    async def advise(self, request: AdviceRequest) -> schemas.Advice: ...


def _month_day(day_of_year: int) -> str:
    return (_REFERENCE_NEW_YEAR + timedelta(days=day_of_year)).strftime("%m-%d")


def _sowing(window: SowingWindow | None) -> schemas.SowingDates | None:
    if window is None:
        return None
    return schemas.SowingDates(
        start=_month_day(window.start_day), end=_month_day(window.end_day), maturity=_month_day(window.maturity_day)
    )


def _land_use(land_use: str) -> schemas.LandUse:
    return schemas.LandUse(id=land_use, name=LAND_USE_NAMES[land_use])


def _optional(value: float) -> float | None:
    return None if isnan(value) else round(value, 2)


def assess_all(
    climate: ClimateNormals, soil: Soil | None, irrigated: bool, lows: DailyLows | None = None
) -> dict[str, Suitability]:
    ph = soil.ph if soil else None
    return {crop.id: assess(crop, climate, soil_ph=ph, irrigated=irrigated, lows=lows) for crop in CROPS}


def reported_history(request: AdviceRequest) -> list[Season]:
    return [Season(land_use, origin="reported") for land_use in request.previous_crops]


def compose(
    *,
    info: schemas.ProviderInfo,
    request: AdviceRequest,
    climate: ClimateNormals,
    soil: Soil | None,
    history: Sequence[Season],
    suitabilities: dict[str, Suitability],
    recommendations: list[schemas.Recommendation],
    successor: strategies.Successor | None,
    gaps: Sequence[str],
) -> schemas.Advice:
    past = [season.land_use for season in history]
    return schemas.Advice(
        provider=info,
        latitude=request.latitude,
        longitude=request.longitude,
        irrigated=request.irrigated,
        climate=schemas.ClimateSummary(
            growing_degree_days=round(climate.growing_degree_days),
            growing_days=climate.growing_days,
            season_temperature=round(climate.season_temperature, 1),
            season_precipitation=round(climate.season_precipitation),
            annual_precipitation=round(climate.annual_precipitation),
            soil_wetness=_optional(climate.season_soil_wetness),
            record_low=_optional(climate.record_low),
            source=CLIMATE_SOURCE,
        ),
        soil=schemas.SoilSummary(**soil.__dict__) if soil else None,
        history=[
            schemas.HistoryEntry(year=season.year, land_use=_land_use(season.land_use), origin=season.origin)
            for season in history
        ],
        recommendations=sorted(recommendations, key=lambda item: -item.score)[:MAX_RECOMMENDATIONS],
        strategies=[
            schemas.RotationStrategy(
                id=strategy.id,
                name=strategy.name,
                is_current=strategy.is_current,
                sequence=[_land_use(item) for item in strategy.sequence],
                summary=strategy.summary,
                evidence=list(strategy.evidence),
                benefits=list(strategy.benefits),
                risks=list(strategy.risks),
                indicators=schemas.StrategyIndicators(**strategy.indicators),
            )
            for strategy in strategies.build(suitabilities, past, successor)
        ],
        gaps=[*gaps, *COMMON_GAPS],
        land_uses=[_land_use(crop.id) for crop in CROPS] + [_land_use(FALLOW)],
    )


def recommend(
    suitability: Suitability,
    history: Sequence[str],
    irrigated: bool,
    *,
    probability: float | None = None,
    model_share: float | None = None,
    model_reason: str | None = None,
) -> schemas.Recommendation:
    """One crop as a recommendation. With a model share the score blends practice and agronomic fit."""
    crop = suitability.crop
    rotation = rotation_effect(crop, history)
    reasons, cautions = describe(suitability, irrigated)
    fit = min(suitability.score * rotation.factor, 1.0)
    score = fit if model_share is None else (fit + model_share) / 2
    return schemas.Recommendation(
        crop=_land_use(crop.id),
        score=round(score, 3),
        suitability=suitability.score,
        probability=None if probability is None else round(probability, 3),
        sowing=_sowing(suitability.sowing),
        reasons=[*([model_reason] if model_reason else []), *rotation.reasons, *reasons],
        cautions=[*rotation.cautions, *cautions],
    )
