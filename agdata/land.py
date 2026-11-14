"""Land datasets: SRTM elevation and USGS NLCD land cover."""

import asyncio
from typing import ClassVar, Iterable

import numpy as np
import pandas as pd

from agdata import base


class SRTM(base.Dataset):
    """SRTM elevation (30 m SRTMGL1 or 90 m SRTMGL3) via OpenTopography."""

    BASE_URL = 'https://portal.opentopography.org/API/globaldem'
    CREDENTIALS = ('OPENTOPOGRAPHY_API_KEY',)

    @classmethod
    async def _authorize(cls, http, credentials):
        return {'params': {'API_Key': credentials[0]}}

    async def elevation(self, bbox: base.Bbox,
                        dem: str = 'SRTMGL1') -> pd.DataFrame:
        """Returns elevation (m) and slope (degrees) for each grid cell.

        Args:
            bbox: (west, south, east, north).
            dem: 'SRTMGL1' (30 m) or 'SRTMGL3' (90 m).

        Returns:
            Columns lat, lon, elevation, slope.
        """
        params = dict(zip(('west', 'south', 'east', 'north'),
                          base.check_bbox(bbox)),
                      demtype=base.check_name(dem), outputFormat='AAIGrid')
        lat, lon, grid = _read_ascii_grid(
            await self._text('GET', params=params))
        per_lat, per_lon = np.gradient(grid, lat, lon)  # m per degree.
        meters = 111_320.0  # Per degree of latitude.
        slope = np.degrees(np.arctan(np.hypot(
            per_lat / meters,
            per_lon / (meters * np.cos(np.radians(lat))[:, None]))))
        lons, lats = np.meshgrid(lon, lat)
        return pd.DataFrame({'lat': lats.ravel(), 'lon': lons.ravel(),
                             'elevation': grid.ravel(),
                             'slope': slope.ravel()})


class NLCD(base.Dataset):
    """USGS National Land Cover Database (30 m, CONUS) from MRLC."""

    BASE_URL = 'https://www.mrlc.gov/geoserver/mrlc_display/wms'
    YEARS: ClassVar[tuple[int, ...]] = (
        2001, 2004, 2006, 2008, 2011, 2013, 2016, 2019, 2021)
    CLASSES: ClassVar[dict[int, str]] = {
        11: 'Open Water', 12: 'Perennial Ice/Snow',
        21: 'Developed, Open Space', 22: 'Developed, Low Intensity',
        23: 'Developed, Medium Intensity', 24: 'Developed, High Intensity',
        31: 'Barren Land', 41: 'Deciduous Forest', 42: 'Evergreen Forest',
        43: 'Mixed Forest', 52: 'Shrub/Scrub', 71: 'Grassland/Herbaceous',
        81: 'Pasture/Hay', 82: 'Cultivated Crops', 90: 'Woody Wetlands',
        95: 'Emergent Herbaceous Wetlands'}

    async def land_cover(self, lat: float, lon: float,
                         years: Iterable[int] = YEARS) -> pd.DataFrame:
        """Returns the land-cover class at a point for each NLCD year."""
        lat, lon = base.check_point(lat, lon)

        async def cover(year: int) -> dict:
            layer = f'NLCD_{int(year)}_Land_Cover_L48'
            data = await self._json('GET', params={
                'service': 'WMS', 'version': '1.1.1',
                'request': 'GetFeatureInfo', 'layers': layer,
                'query_layers': layer, 'srs': 'EPSG:4326',
                'bbox': f'{lon - 1e-4},{lat - 1e-4},{lon + 1e-4},{lat + 1e-4}',
                'width': 3, 'height': 3, 'x': 1, 'y': 1,
                'info_format': 'application/json'})
            features = data.get('features') or [{}]
            code = features[0].get('properties', {}).get('PALETTE_INDEX')
            return {'year': int(year), 'code': code,
                    'class': self.CLASSES.get(code)}

        return pd.DataFrame(await asyncio.gather(*map(cover, years)))


def _read_ascii_grid(text: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Parses an ESRI ASCII grid into cell-center lat, lon and values."""
    lines = text.splitlines()
    head = {}  # ncols, nrows, xllcorner, yllcorner, cellsize, nodata_value.
    for line in lines:
        words = line.split()
        if len(words) != 2 or not words[0][0].isalpha():
            break
        head[words[0].lower()] = float(words[1])
    if 'ncols' not in head or 'nrows' not in head:
        raise base.DatasetError(f'Not an ASCII grid: {text[:200]}')
    grid = np.loadtxt(lines[len(head):], ndmin=2)
    if grid.shape != (head['nrows'], head['ncols']):
        raise base.DatasetError(f'Grid shape {grid.shape} mismatches header.')
    grid[grid == head.get('nodata_value')] = np.nan
    dx = head.get('cellsize') or head['dx']
    dy = head.get('cellsize') or head['dy']
    x0 = head.get('xllcenter', head.get('xllcorner', 0) + dx / 2)
    y0 = head.get('yllcenter', head.get('yllcorner', 0) + dy / 2)
    lon = x0 + dx * np.arange(grid.shape[1])
    lat = y0 + dy * np.arange(grid.shape[0])[::-1]  # First row is northmost.
    return lat, lon, grid
