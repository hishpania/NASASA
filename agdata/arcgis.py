"""ArcGIS ImageServer datasets: FAO GAEZ, USFS LANDFIRE and NAIP."""

import json
from typing import ClassVar

import pandas as pd

from agdata import base


class ImageService(base.Dataset):
    """Pixel values of an ArcGIS ImageServer at a point.

    `BASE_URL` is the services root; `LAYER` the default image service path
    under it.
    """

    LAYER: ClassVar[str] = ''
    BANDS: ClassVar[tuple[str, ...]] = ('value',)

    async def identify(self, lat: float, lon: float, where: str | None = None,
                       layer: str | None = None) -> pd.DataFrame:
        """Returns pixel values at a point.

        Args:
            lat: Latitude.
            lon: Longitude.
            where: SQL filter on catalog attributes of mosaic datasets,
                e.g. "crop='Maize'". Quote values with `base.sql_text`.
            layer: Image service path; defaults to `LAYER`.

        Returns:
            One row per raster (with catalog attributes for mosaics) and
            one column per band.
        """
        lat, lon = base.check_point(lat, lon)
        layer = base.check_name(layer or self.LAYER, r'[\w./-]+')
        params = {
            'geometry': json.dumps({'x': lon, 'y': lat,
                                    'spatialReference': {'wkid': 4326}}),
            'geometryType': 'esriGeometryPoint',
            'returnGeometry': 'false',
            'returnCatalogItems': 'true',
            'maxItemCount': 1000,
            'f': 'json',
        }
        if where:
            params['mosaicRule'] = json.dumps({'where': where})
        data = await self._json('GET', f'{layer}/ImageServer/identify',
                                params=params)
        if 'error' in data:
            raise base.DatasetError(data['error'])
        items = (data.get('catalogItems') or {}).get('features') or []
        if items:
            values = data['properties']['Values']
            rows = pd.DataFrame([item['attributes'] for item in items])
        else:
            values, rows = [data['value']], pd.DataFrame(index=[0])
        bands = pd.Series(values, dtype=str).str.split(r'[,\s]+', expand=True)
        bands.columns = list(self.BANDS)[:bands.shape[1]]
        return rows.join(bands.apply(pd.to_numeric, errors='coerce'))


class GAEZ(ImageService):
    """FAO GAEZ v4 crop suitability, yields and agro-climatic resources.

    Layers (themes): res01 land & water resources, res02 agro-climatic
    resources, res05 suitability & attainable yield (default), res06 actual
    yields & production, res07 yield & production gaps.
    """

    BASE_URL = 'https://gaez-services.fao.org/server/rest/services/'
    LAYER = 'res05'

    async def suitability(self, lat: float, lon: float, crop: str,
                          rcp: str = 'Historical') -> pd.DataFrame:
        """Returns suitability and attainable yield layers for a crop.

        Args:
            lat: Latitude.
            lon: Longitude.
            crop: GAEZ crop name, e.g. 'Maize', 'Soybean', 'Wheat'.
            rcp: Climate scenario: 'Historical', 'RCP2.6' ... 'RCP8.5'.
        """
        where = f'crop={base.sql_text(crop)} AND rcp={base.sql_text(rcp)}'
        return await self.identify(lat, lon, where=where)


class LANDFIRE(ImageService):
    """USFS LANDFIRE vegetation and fuel layers (30 m, US).

    Layers follow 'Landfire_LF<ver>/LF<ver>_<PRODUCT>_<REGION>', e.g.
    EVT (vegetation type), EVC (cover), EVH (height), FBFM40 (fuel model).
    """

    BASE_URL = 'https://lfps.usgs.gov/arcgis/rest/services/'
    LAYER = 'Landfire_LF2024/LF2024_EVT_CONUS'


class NAIP(ImageService):
    """USDA NAIP 1 m aerial imagery: RGB+NIR pixels for every acquisition."""

    BASE_URL = 'https://imagery.nationalmap.gov/arcgis/rest/services/'
    LAYER = 'USGSNAIPImagery'
    BANDS = ('red', 'green', 'blue', 'nir')

    async def pixels(self, lat: float, lon: float) -> pd.DataFrame:
        """Returns band values and NDVI per acquisition, newest first."""
        frame = await self.identify(lat, lon)
        if 'nir' in frame:
            frame['ndvi'] = (frame.nir - frame.red) / (frame.nir + frame.red)
        if 'acquisition_date' in frame:
            frame['acquisition_date'] = pd.to_datetime(
                frame['acquisition_date'], unit='ms')
            frame = frame.sort_values('acquisition_date', ascending=False)
        return frame
