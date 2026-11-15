"""Crop Advisor API: sowing recommendations and rotation strategies for a field."""

import logging
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import FastAPI, HTTPException, Query, Request

from . import schemas
from .crops import CROPS, LAND_USE_NAMES
from .forecast import Forecast
from .model import RotationModel
from .providers.base import AdviceRequest
from .providers.ecocrop import GlobalRulesProvider
from .providers.router import Advisor
from .providers.us_model import UsModelProvider
from .sources.client import DataSources, SourceUnavailable

logging.basicConfig(level=logging.INFO)


logger = logging.getLogger(__name__)


def load_model() -> RotationModel | None:
    """The service stays useful without the model: every field is then answered by the rules provider."""
    try:
        return RotationModel.load_or_train()
    except Exception:
        logger.exception("The US rotation model is unavailable; falling back to agronomic rules everywhere")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    model = load_model()
    async with httpx.AsyncClient(headers={"User-Agent": "crop-advisor"}) as http:
        sources = DataSources(http)
        # Order matters: the first provider that covers a point answers for it.
        providers = [UsModelProvider(sources, model)] if model else []
        providers.append(GlobalRulesProvider(sources, model_missing=model is None))
        app.state.model = model
        app.state.sources = sources
        app.state.advisor = Advisor(providers)
        yield


app = FastAPI(title="Crop Advisor", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health(request: Request) -> dict:
    model: RotationModel | None = request.app.state.model
    return {"status": "healthy", "model": {"outcomes": model.classes, "metrics": model.metrics} if model else None}


@app.get("/providers")
def providers(request: Request) -> list[schemas.ProviderInfo]:
    return request.app.state.advisor.providers


@app.get("/crops")
def crops() -> list[schemas.CropInfo]:
    return [
        schemas.CropInfo(
            id=crop.id, name=crop.name, family=crop.family, sowing=crop.sowing,
            fixes_nitrogen=crop.fixes_nitrogen, water_need=crop.water_need,
        )
        for crop in CROPS
    ]


@app.get("/advice")
async def advice(
    request: Request,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
    previous_crops: Annotated[
        str | None,
        Query(alias="previousCrops", description="Comma-separated land uses, most recent season first."),
    ] = None,
    irrigated: bool = False,
) -> schemas.Advice:
    previous = tuple(item.strip() for item in (previous_crops or "").split(",") if item.strip())
    unknown = [item for item in previous if item not in LAND_USE_NAMES]
    if unknown:
        raise HTTPException(422, f"Unknown land use: {', '.join(unknown)}")

    try:
        return await request.app.state.advisor.advise(AdviceRequest(latitude, longitude, previous, irrigated))
    except SourceUnavailable as error:
        raise HTTPException(503, str(error)) from error


def _forecast_schema(forecast: Forecast) -> schemas.Forecast:
    return schemas.Forecast(
        latitude=forecast.latitude,
        longitude=forecast.longitude,
        last_observed=forecast.last_observed,
        source="NASA POWER monthly, 2001 to date",
        series=[
            schemas.ForecastSeries(
                id=outlook.indicator.id,
                name=outlook.indicator.name,
                unit=outlook.indicator.unit,
                history=[schemas.ForecastPoint(**vars(point)) for point in outlook.history],
                forecast=[schemas.ForecastPoint(**vars(point)) for point in outlook.forecast],
                skill=[schemas.ForecastSkill(**vars(skill)) for skill in outlook.skill],
            )
            for outlook in forecast.outlooks
        ],
    )


@app.get("/forecast")
async def forecast(
    request: Request,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
) -> schemas.Forecast:
    try:
        return _forecast_schema(await request.app.state.sources.forecast(latitude, longitude))
    except SourceUnavailable as error:
        raise HTTPException(503, str(error)) from error
