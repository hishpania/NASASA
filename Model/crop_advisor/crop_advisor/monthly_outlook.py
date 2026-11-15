import asyncio
import datetime
import logging
from dataclasses import dataclass
from pathlib import Path

import outlook
import pandas as pd

from .sources.client import SourceUnavailable

logger = logging.getLogger(__name__)

ESTIMATORS = (
    ("temperature", outlook.AirTemperature),
    ("humidity", outlook.RelativeHumidity),
    ("soil_wetness", outlook.RootZoneSoilWetness),
)
BACKTEST_START = "2010-03-01"
HALF_WIDTH = 2.0
HALF_HEIGHT = 1.5
GEOS_CACHE = Path(__file__).resolve().parent.parent / "data" / "cache" / "geos"

Key = tuple[int, int, datetime.date]


@dataclass(frozen=True)
class Month:
    month: str
    lead: int
    below: float
    near: float
    above: float
    normal_low: float
    normal_high: float
    confidence: str
    skill: float
    hit_rate: float


@dataclass(frozen=True)
class Series:
    id: str
    name: str
    units: str
    below_label: str
    above_label: str
    months: list[Month]


@dataclass(frozen=True)
class Preparing:
    started_at: datetime.datetime


@dataclass(frozen=True)
class FieldOutlook:
    forecast_date: str
    series: list[Series]


class MonthlyOutlooks:
    def __init__(self) -> None:
        self._tasks: dict[Key, asyncio.Task[list[pd.DataFrame]]] = {}
        self._started: dict[Key, datetime.datetime] = {}
        self._slot = asyncio.Semaphore(1)

    def at(self, latitude: float, longitude: float) -> FieldOutlook | Preparing:
        month = datetime.date.today().replace(day=1)
        key = (round(latitude), round(longitude), month)
        for stale in [other for other in self._tasks if other[2] != month]:
            del self._tasks[stale]
            del self._started[stale]
        task = self._tasks.get(key)
        if task is None:
            task = self._tasks[key] = asyncio.create_task(self._train(key))
            self._started[key] = datetime.datetime.now(datetime.UTC)
        if not task.done():
            return Preparing(self._started[key])
        if (error := task.exception()) is not None:
            del self._tasks[key]
            del self._started[key]
            raise SourceUnavailable(f"The monthly outlook could not be trained: {error}") from error
        return _at_field(task.result(), latitude, longitude)

    async def _train(self, key: Key) -> list[pd.DataFrame]:
        lat, lon, _ = key
        bbox = (lon - HALF_WIDTH, max(lat - HALF_HEIGHT, -90), lon + HALF_WIDTH, min(lat + HALF_HEIGHT, 90))
        async with self._slot:
            logger.info("Training the monthly outlook of %s", bbox)
            region = await outlook.fetch_region(bbox, cache_dir=GEOS_CACHE)
            return await asyncio.to_thread(_predict, region)


def _predict(region: outlook.Region) -> list[pd.DataFrame]:
    return [
        estimator(backtest_start=BACKTEST_START).fit(region).predict_proba(region).assign(id=series_id)
        for series_id, estimator in ESTIMATORS
    ]


def _at_field(frames: list[pd.DataFrame], latitude: float, longitude: float) -> FieldOutlook:
    series = []
    for frame in frames:
        nearest = ((frame.lat - latitude) ** 2 + (frame.lon - longitude) ** 2).idxmin()
        cell = frame[(frame.lat == frame.lat[nearest]) & (frame.lon == frame.lon[nearest])]
        series.append(
            Series(
                id=cell.id.iloc[0],
                name=frame.attrs["name"],
                units=frame.attrs["units"],
                below_label=frame.attrs["below"],
                above_label=frame.attrs["above"],
                months=[
                    Month(
                        month=f"{row.month:%Y-%m}",
                        lead=int(row.lead),
                        below=round(float(row.below), 3),
                        near=round(float(row.near), 3),
                        above=round(float(row.above), 3),
                        normal_low=round(float(row.normal_low), 2),
                        normal_high=round(float(row.normal_high), 2),
                        confidence=row.confidence,
                        skill=round(float(row.skill), 3),
                        hit_rate=round(float(row.hit_rate), 3),
                    )
                    for row in cell.sort_values("lead").itertuples()
                ],
            )
        )
    return FieldOutlook(forecast_date=f"{frames[0].attrs['forecast_date']:%Y-%m-%d}", series=series)
