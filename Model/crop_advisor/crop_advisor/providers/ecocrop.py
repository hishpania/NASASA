"""Worldwide provider: agronomic rules over NASA climate normals, no training data needed."""

from .. import schemas
from ..geo import is_in_conus
from ..sources.client import DataSources
from .base import AdviceRequest, assess_all, compose, recommend, reported_history

INFO = schemas.ProviderInfo(
    id="global-rules",
    name="Global agro-climatic rules",
    kind="rules",
    description=(
        "Matches each crop's temperature, heat and water requirements (FAO ECOCROP style) "
        "against NASA POWER climate normals for the field. Works anywhere on Earth."
    ),
)

_NO_HISTORY_GAP = (
    "No satellite crop history is available here: tell the tool what grew last season to get rotation-aware advice."
)
_NO_SOIL_GAP = "Soil properties are not included by this provider; check a local soil test for pH and drainage."
_NO_MODEL_GAP = "The US rotation model is not loaded on this server, so rule-based advice is shown instead."


class GlobalRulesProvider:
    info = INFO

    def __init__(self, sources: DataSources, *, model_missing: bool = False) -> None:
        self._sources = sources
        self._model_missing = model_missing

    def covers(self, latitude: float, longitude: float) -> bool:
        return True

    async def advise(self, request: AdviceRequest) -> schemas.Advice:
        climate = await self._sources.climate(request.latitude, request.longitude)
        history = reported_history(request)
        past = [season.land_use for season in history]
        suitabilities = assess_all(climate, None, request.irrigated)

        gaps = [] if history else [_NO_HISTORY_GAP]
        gaps.append(_NO_SOIL_GAP)
        if self._model_missing and is_in_conus(request.latitude, request.longitude):
            gaps.insert(0, _NO_MODEL_GAP)

        return compose(
            info=INFO,
            request=request,
            climate=climate,
            soil=None,
            history=history,
            suitabilities=suitabilities,
            recommendations=[
                recommend(suitability, past, request.irrigated)
                for suitability in suitabilities.values() if suitability.is_viable
            ],
            successor=None,
            gaps=gaps,
        )
