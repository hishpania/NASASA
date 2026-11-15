"""ISRIC SoilGrids 2.0: modelled topsoil pH anywhere on Earth, from a bundled 5 km raster."""

import atexit
import threading
from functools import cache
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import transform
from rasterio.windows import Window

from .soil import Soil

RASTER_PATH = Path(__file__).resolve().parents[2] / "data" / "soilgrids" / "phh2o_0-5cm_mean_5000.tif"
SOURCE = "ISRIC SoilGrids 2.0, modelled topsoil pH (0–5 cm) on a 5 km grid"
NAME = "SoilGrids estimate"

# Cities and water have no value, so a field next to them takes the median of the cells around it.
_NEIGHBOURHOOD = 2
_PH_SCALE = 10
_lock = threading.Lock()


@cache
def _raster() -> rasterio.DatasetReader:
    raster = rasterio.open(RASTER_PATH)
    atexit.register(raster.close)
    return raster


def ph_from_cells(cells: np.ndarray, nodata: float) -> float | None:
    """pH of the centre cell, or the median of its valid neighbours when the centre has no value."""
    centre = cells[cells.shape[0] // 2, cells.shape[1] // 2]
    if centre != nodata:
        return round(float(centre) / _PH_SCALE, 1)
    valid = cells[cells != nodata]
    if valid.size == 0:
        return None
    return round(float(np.median(valid)) / _PH_SCALE, 1)


def soil_at(latitude: float, longitude: float) -> Soil | None:
    with _lock:
        return _read(latitude, longitude)


def _read(latitude: float, longitude: float) -> Soil | None:
    raster = _raster()
    (x,), (y,) = transform("EPSG:4326", raster.crs, [longitude], [latitude])
    row, col = raster.index(x, y)
    if not (0 <= row < raster.height and 0 <= col < raster.width):
        return None
    window = Window(col - _NEIGHBOURHOOD, row - _NEIGHBOURHOOD, 2 * _NEIGHBOURHOOD + 1, 2 * _NEIGHBOURHOOD + 1)
    cells = raster.read(1, window=window, boundless=True, fill_value=raster.nodata)
    ph = ph_from_cells(cells, raster.nodata)
    if ph is None:
        return None
    return Soil(name=NAME, drainage=None, ph=ph, organic_matter=None, clay=None, sand=None, source=SOURCE)
