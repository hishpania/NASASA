"""Async access to the external data services, with a small in-memory cache."""

import asyncio
import datetime
import logging
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx

from .. import forecast as outlook
from ..climate import ClimateNormals
from ..crops import land_use_from_cdl
from . import cdl, power, power_monthly, soil

T = TypeVar("T")

logger = logging.getLogger(__name__)

# The services answer for a grid cell, so nearby points share an answer.
_CLIMATE_PRECISION = 2
_FIELD_PRECISION = 4
_CACHE_SIZE = 2048

POWER_TIMEOUT = 9.0
POWER_MONTHLY_TIMEOUT = 20.0
CDL_TIMEOUT = 7.0
SOIL_TIMEOUT = 6.0


class SourceUnavailable(Exception):
    """A data service the advice cannot be built without did not answer."""


class DataSources:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http
        self._cache: OrderedDict[tuple, object] = OrderedDict()
        self._pending: dict[tuple, asyncio.Task] = {}

    async def _cached(self, key: tuple, load: Callable[[], Awaitable[T]]) -> T:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]  # type: ignore[return-value]
        task = self._pending.get(key)
        if task is None:
            task = self._pending[key] = asyncio.ensure_future(load())
            task.add_done_callback(lambda _: self._pending.pop(key, None))
        value = await task
        self._cache[key] = value
        if len(self._cache) > _CACHE_SIZE:
            self._cache.popitem(last=False)
        return value

    async def climate(self, latitude: float, longitude: float) -> ClimateNormals:
        async def load() -> ClimateNormals:
            try:
                response = await self._http.get(power.URL, params=power.query(latitude, longitude), timeout=POWER_TIMEOUT)
                response.raise_for_status()
                return power.parse(response.json())
            except (httpx.HTTPError, KeyError, ValueError) as error:
                raise SourceUnavailable(f"NASA POWER climate normals are unavailable: {error}") from error

        return await self._cached(("climate", round(latitude, _CLIMATE_PRECISION), round(longitude, _CLIMATE_PRECISION)), load)

    async def forecast(self, latitude: float, longitude: float) -> outlook.Forecast:
        async def load() -> outlook.Forecast:
            params = power_monthly.query(latitude, longitude, datetime.date.today().year)
            try:
                response = await self._http.get(power_monthly.URL, params=params, timeout=POWER_MONTHLY_TIMEOUT)
                response.raise_for_status()
                series = power_monthly.parse(response.json())
                return await asyncio.to_thread(outlook.build, series)
            except (httpx.HTTPError, KeyError, ValueError) as error:
                raise SourceUnavailable(f"NASA POWER monthly data is unavailable: {error}") from error

        key = ("forecast", round(latitude, _CLIMATE_PRECISION), round(longitude, _CLIMATE_PRECISION), datetime.date.today())
        return await self._cached(key, load)

    async def land_use(self, latitude: float, longitude: float, year: int) -> str | None:
        """Land use the Cropland Data Layer saw in `year`; None when it has no answer."""
        async def load() -> str | None:
            response = await self._http.get(cdl.URL, params=cdl.query(latitude, longitude, year), timeout=CDL_TIMEOUT)
            response.raise_for_status()
            return land_use_from_cdl(cdl.parse(response.text))

        key = ("cdl", round(latitude, _FIELD_PRECISION), round(longitude, _FIELD_PRECISION), year)
        try:
            return await self._cached(key, load)
        except (httpx.HTTPError, ValueError) as error:
            logger.warning("CDL %s lookup failed: %s", year, error)
            return None

    async def soil(self, latitude: float, longitude: float) -> soil.Soil | None:
        async def load() -> soil.Soil | None:
            response = await self._http.post(soil.URL, json=soil.request_body(latitude, longitude), timeout=SOIL_TIMEOUT)
            response.raise_for_status()
            return soil.parse(response.json())

        key = ("soil", round(latitude, _FIELD_PRECISION), round(longitude, _FIELD_PRECISION))
        try:
            return await self._cached(key, load)
        except (httpx.HTTPError, ValueError) as error:
            logger.warning("SSURGO lookup failed: %s", error)
            return None
