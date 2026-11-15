"""Builds the US training set: crop sequences from CDL joined with NASA POWER climate normals.

Standard library only, so it runs anywhere:

    python -m crop_advisor.training.collect --points 600

Responses are cached next to the dataset, so an interrupted run resumes where it stopped.
"""

import argparse
import csv
import json
import random
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from ..climate import CLIMATE_FEATURES
from ..crops import CROPS_BY_ID, FALLOW, land_use_from_cdl
from ..geo import is_in_conus
from ..sources import cdl, power

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATASET_PATH = DATA_DIR / "us_training.csv"
CACHE_PATH = DATA_DIR / "cache" / "collect.json"

HISTORY_YEARS = 2
FIRST_YEAR = 2016
TARGET_YEARS = range(FIRST_YEAR + HISTORY_YEARS, cdl.LATEST_YEAR + 1)

COLUMNS = (
    "point_id", "latitude", "longitude", "year", "crop", "previous_crop", "previous_crop_2", *CLIMATE_FEATURES,
)

# (west, south, east, north, weight): where US field crops concentrate, so that
# random points land on cropland often and minor crops are represented.
REGIONS = (
    (-97.5, 38.5, -82.5, 44.5, 28),    # Corn Belt
    (-105.0, 44.5, -95.5, 49.0, 18),   # Northern Plains
    (-103.5, 33.0, -96.5, 41.0, 20),   # Central and Southern Plains
    (-92.5, 31.0, -89.5, 36.8, 9),     # Mississippi Delta
    (-86.5, 30.5, -77.0, 36.5, 8),     # Southeastern coastal plain
    (-102.8, 32.0, -100.0, 35.0, 4),   # Texas High Plains
    (-98.5, 26.0, -96.0, 30.0, 3),     # Texas coast
    (-120.5, 45.3, -116.0, 48.0, 5),   # Columbia Basin and Palouse
    (-117.0, 42.3, -111.5, 44.2, 4),   # Snake River Plain
    (-122.3, 35.2, -119.0, 40.2, 4),   # California Central Valley
    (-112.5, 47.0, -108.0, 49.0, 4),   # Montana Golden Triangle
    (-90.0, 42.0, -76.0, 45.0, 4),     # Great Lakes
)

_cache: dict[str, object] = {}
_cache_lock = threading.Lock()


def _load_cache() -> None:
    if CACHE_PATH.exists():
        _cache.update(json.loads(CACHE_PATH.read_text()))


def _save_cache() -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _cache_lock:
        snapshot = json.dumps(_cache)
    CACHE_PATH.write_text(snapshot)


def _fetch(url: str, params: dict[str, str], timeout: float, attempts: int = 3) -> str | None:
    request = f"{url}?{urllib.parse.urlencode(params)}"
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read().decode()
        except (urllib.error.URLError, TimeoutError, OSError):
            time.sleep(1 + attempt * 2)
    return None


def _land_use(latitude: float, longitude: float, year: int) -> str | None:
    key = f"cdl:{latitude:.5f}:{longitude:.5f}:{year}"
    with _cache_lock:
        if key in _cache:
            return _cache[key]  # type: ignore[return-value]
    body = _fetch(cdl.URL, cdl.query(latitude, longitude, year), timeout=20)
    if body is None:
        return None
    try:
        land_use = land_use_from_cdl(cdl.parse(body))
    except ValueError:
        return None
    with _cache_lock:
        _cache[key] = land_use
    return land_use


def _climate_features(latitude: float, longitude: float) -> dict[str, float] | None:
    # The raw normals are cached, not the features, so a change in feature code needs no refetch.
    key = f"power-normals:{latitude:.5f}:{longitude:.5f}"
    with _cache_lock:
        payload = _cache.get(key)
    if payload is None:
        body = _fetch(power.URL, power.query(latitude, longitude), timeout=60)
        if body is None:
            return None
        response = json.loads(body)
        payload = {name: response.get(name) for name in ("geometry", "header", "properties")}
        with _cache_lock:
            _cache[key] = payload
    try:
        return power.parse(payload).features()  # type: ignore[arg-type]
    except (power.ClimateUnavailable, KeyError, TypeError, ValueError):
        return None


def _candidates(random_source: random.Random):
    weights = [region[4] for region in REGIONS]
    while True:
        west, south, east, north, _ = random_source.choices(REGIONS, weights)[0]
        latitude = round(random_source.uniform(south, north), 5)
        longitude = round(random_source.uniform(west, east), 5)
        if is_in_conus(latitude, longitude):
            yield latitude, longitude


def _is_field(land_use: str | None) -> bool:
    return land_use in CROPS_BY_ID or land_use == FALLOW


def _find_fields(count: int, seed: int, workers: int) -> list[tuple[float, float]]:
    """Samples random points and keeps those that carried a field crop in the newest CDL year."""
    candidates = _candidates(random.Random(seed))
    fields: list[tuple[float, float]] = []
    tried = 0
    with ThreadPoolExecutor(workers) as pool:
        while len(fields) < count:
            batch = [next(candidates) for _ in range(workers * 8)]
            tried += len(batch)
            uses = pool.map(lambda point: _land_use(*point, cdl.LATEST_YEAR), batch)
            fields.extend(point for point, land_use in zip(batch, uses) if _is_field(land_use))
            _save_cache()
            print(f"fields found: {min(len(fields), count)}/{count} after {tried} candidates", flush=True)
    return fields[:count]


def _rows_for(point_id: int, point: tuple[float, float], history: dict[int, str | None], climate: dict) -> list[dict]:
    latitude, longitude = point
    rows = []
    for year in TARGET_YEARS:
        crop, previous, previous_2 = history[year], history[year - 1], history[year - 2]
        if not _is_field(crop) or previous is None or previous_2 is None:
            continue
        rows.append({
            "point_id": point_id, "latitude": latitude, "longitude": longitude, "year": year,
            "crop": crop, "previous_crop": previous, "previous_crop_2": previous_2, **climate,
        })
    return rows


def _map_with_progress(pool: ThreadPoolExecutor, function, tasks: list, label: str) -> list:
    results = []
    for done, result in enumerate(pool.map(function, tasks), start=1):
        results.append(result)
        if done % 200 == 0 or done == len(tasks):
            _save_cache()
            print(f"{label}: {done}/{len(tasks)}", flush=True)
    return results


def collect(points: int, seed: int, workers: int) -> None:
    _load_cache()
    fields = _find_fields(points, seed, workers)
    years = range(FIRST_YEAR, cdl.LATEST_YEAR + 1)
    with ThreadPoolExecutor(workers) as pool:
        tasks = [(point, year) for point in fields for year in years]
        uses = _map_with_progress(pool, lambda task: _land_use(*task[0], task[1]), tasks, "crop history")
        climates = _map_with_progress(pool, lambda point: _climate_features(*point), fields, "climate normals")

    histories: dict[tuple[float, float], dict[int, str | None]] = {point: {} for point in fields}
    for (point, year), land_use in zip(tasks, uses):
        histories[point][year] = land_use

    rows: list[dict] = []
    for point_id, (point, climate) in enumerate(zip(fields, climates)):
        if climate is not None:
            rows.extend(_rows_for(point_id, point, histories[point], climate))

    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATASET_PATH.open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} rows from {len(fields)} points to {DATASET_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--points", type=int, default=600, help="number of field points to sample")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--workers", type=int, default=6, help="parallel requests to the data services")
    arguments = parser.parse_args()
    collect(arguments.points, arguments.seed, arguments.workers)
