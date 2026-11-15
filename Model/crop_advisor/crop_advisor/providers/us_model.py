"""United States provider: the rotation model trained on the Cropland Data Layer, plus SSURGO soils."""

import asyncio

from .. import schemas
from ..crops import CROPS_BY_ID, LAND_USE_NAMES, OTHER_CROP
from ..geo import is_in_conus
from ..model import RotationModel
from ..sources import cdl
from ..sources.client import DataSources
from .base import AdviceRequest, OutOfCoverage, Season, assess_all, compose, recommend, reported_history

HISTORY_YEARS = 5

INFO = schemas.ProviderInfo(
    id="us-rotation-model",
    name="US crop rotation model",
    kind="model",
    description=(
        "A machine-learning model trained on crop sequences from the USDA Cropland Data Layer and "
        "NASA POWER climate normals, combined with agronomic rules and the SSURGO soil survey."
    ),
)


class UsModelProvider:
    info = INFO

    def __init__(self, sources: DataSources, model: RotationModel) -> None:
        self._sources = sources
        self._model = model

    def covers(self, latitude: float, longitude: float) -> bool:
        return is_in_conus(latitude, longitude)

    async def advise(self, request: AdviceRequest) -> schemas.Advice:
        point = request.latitude, request.longitude
        years = range(cdl.LATEST_YEAR, cdl.LATEST_YEAR - HISTORY_YEARS, -1)
        climate, soil, *land_uses = await asyncio.gather(
            self._sources.climate(*point),
            self._sources.soil(*point),
            *(self._sources.land_use(*point, year) for year in years),
        )
        observed = [Season(land_use, year) for year, land_use in zip(years, land_uses) if land_use]
        history = reported_history(request) or observed
        if not history:
            raise OutOfCoverage("the Cropland Data Layer has no crop history here")
        past = [season.land_use for season in history]
        suitabilities = assess_all(climate, soil, request.irrigated)
        climate_features = climate.features()

        def successor(previous: str, previous_2: str | None) -> dict[str, float]:
            return self._model.probabilities(climate_features, previous, previous_2)

        probabilities = successor(past[0], past[1] if len(past) > 1 else None)
        crop_probabilities = {item: share for item, share in probabilities.items() if item in CROPS_BY_ID}
        top = max(crop_probabilities.values(), default=0.0) or 1.0
        basis = " after ".join(LAND_USE_NAMES[item].lower() for item in past[:2])

        recommendations = []
        for crop_id, suitability in suitabilities.items():
            probability = crop_probabilities.get(crop_id)
            if not suitability.is_viable and not probability:
                continue
            recommendations.append(recommend(
                suitability, past, request.irrigated,
                probability=probability,
                model_share=(probability or 0.0) / top,
                model_reason=(
                    f"Planted next on {probability:.0%} of similar US fields that grew {basis}."
                    if probability and probability >= 0.01 else None
                ),
            ))

        gaps = [
            f"Crop history comes from satellite classification at the field center and ends in {cdl.LATEST_YEAR}; "
            "tell the tool what grew last season if it differs."
        ] if history is observed else []
        if past[0] == OTHER_CROP:
            gaps.append("The latest crop on this field is outside the catalog, so rotation effects are approximate.")
        if soil is None:
            gaps.append("The soil survey did not answer for this point; soil pH is not taken into account.")
        gaps.append("The model reflects what farmers planted in 2018–2024, which is common practice, not proof of what is best.")

        return compose(
            info=INFO,
            request=request,
            climate=climate,
            soil=soil,
            history=history,
            suitabilities=suitabilities,
            recommendations=recommendations,
            successor=successor,
            gaps=gaps,
        )
