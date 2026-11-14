"""NASA Earthdata: SMAP, GPM IMERG, Landsat, MODIS, VIIRS, ECOSTRESS,
NLDAS, GLDAS and GEDI.

All classes share Earthdata Login credentials (`EARTHDATA_USERNAME`,
`EARTHDATA_PASSWORD`); `Earthdata.login(user, password)` sets them for all.
"""

import asyncio
import io
from typing import ClassVar, Sequence

import aiohttp
import pandas as pd

from agdata import base

_CMR = 'https://cmr.earthdata.nasa.gov/search/granules.json'
_EDL_TOKEN = 'https://urs.earthdata.nasa.gov/api/users/find_or_create_token'


class Earthdata(base.Dataset):
    """Base for NASA Earthdata datasets; lists granules via CMR."""

    CREDENTIALS = ('EARTHDATA_USERNAME', 'EARTHDATA_PASSWORD')
    SHORT_NAME: ClassVar[str] = ''  # Default CMR collection.

    async def granules(self, bbox: base.Bbox, start, end,
                       short_name: str | None = None,
                       limit: int = 2000) -> pd.DataFrame:
        """Lists data files (granules) intersecting `bbox` within dates.

        Args:
            bbox: (west, south, east, north).
            start: Start date.
            end: End date.
            short_name: CMR collection short name; defaults to `SHORT_NAME`.
            limit: Maximum number of granules (1-2000).

        Returns:
            One row per granule: title, time_start, time_end, size_mb, url.
        """
        params = {
            'short_name': base.check_name(short_name or self.SHORT_NAME),
            'bounding_box': ','.join(map(str, base.check_bbox(bbox))),
            'temporal': f'{base.date(start)},{base.date(end)}T23:59:59Z',
            'page_size': max(1, min(int(limit), 2000)),
        }
        data = await self._json('GET', _CMR, params=params, public=True)
        return pd.DataFrame([{
            'title': g.get('title'),
            'time_start': g.get('time_start'),
            'time_end': g.get('time_end'),
            'size_mb': g.get('granule_size'),
            'url': next((l['href'] for l in g.get('links', [])
                         if l.get('rel', '').endswith('/data#')), None),
        } for g in data.get('feed', {}).get('entry', [])])


class AppEEARS(Earthdata):
    """Point time series extracted by NASA AppEEARS.

    AppEEARS is asynchronous: a task is submitted and polled until done,
    which can take minutes.
    """

    BASE_URL = 'https://appeears.earthdatacloud.nasa.gov/api/'
    PRODUCT: ClassVar[str] = ''
    LAYERS: ClassVar[tuple[str, ...]] = ()
    POLL_SECONDS: ClassVar[float] = 15
    MAX_WAIT: ClassVar[float] = 3600  # Seconds before giving up on a task.

    @classmethod
    async def _authorize(cls, http, credentials):
        token = await _token(http, cls.BASE_URL + 'login', credentials,
                             'token')
        return {'headers': {'Authorization': f'Bearer {token}'}}

    async def point(self, lat: float, lon: float, start, end,
                    layers: Sequence[str] | None = None,
                    product: str | None = None) -> pd.DataFrame:
        """Returns layer values at a point; one row per observation date.

        Args:
            lat: Latitude.
            lon: Longitude.
            start: Start date.
            end: End date.
            layers: Product layers; defaults to `LAYERS`.
            product: AppEEARS product id; defaults to `PRODUCT`.
        """
        lat, lon = base.check_point(lat, lon)
        product = base.check_name(product or self.PRODUCT)
        task = {
            'task_type': 'point',
            'task_name': f'agdata-{product}',
            'params': {
                'dates': [{'startDate': base.date(start, '%m-%d-%Y'),
                           'endDate': base.date(end, '%m-%d-%Y')}],
                'layers': [{'product': product, 'layer': base.check_name(l)}
                           for l in layers or self.LAYERS],
                'coordinates': [{'latitude': lat, 'longitude': lon}],
            },
        }
        task_id = base.check_name(
            (await self._json('POST', 'task', json=task))['task_id'])
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.MAX_WAIT
        while True:
            status = (await self._json('GET', f'task/{task_id}'))['status']
            if status == 'done':
                break
            if status == 'error' or loop.time() > deadline:
                raise base.DatasetError(f'AppEEARS task {task_id}: {status}.')
            await asyncio.sleep(self.POLL_SECONDS)
        files = (await self._json('GET', f'bundle/{task_id}'))['files']
        csv = next(f for f in files if f['file_name'].endswith('results.csv'))
        body = await self._request(
            'GET', f'bundle/{task_id}/{base.check_name(csv["file_id"])}')
        return pd.read_csv(io.BytesIO(body), parse_dates=['Date'])


class Giovanni(Earthdata):
    """Point time series from the Giovanni in the Cloud Time Series API."""

    BASE_URL = 'https://api.giovanni.earthdata.nasa.gov/'
    COLLECTION: ClassVar[str] = ''  # Giovanni id prefix: <ShortName>_<ver>.
    VARIABLE: ClassVar[str] = ''
    _HEADER_LINES: ClassVar[int] = 13

    @classmethod
    async def _authorize(cls, http, credentials):
        token = await _token(http, _EDL_TOKEN, credentials, 'access_token')
        return {'headers': {'Authorization': f'Bearer {token}'}}

    async def timeseries(self, lat: float, lon: float, start, end,
                         variable: str | None = None) -> pd.DataFrame:
        """Returns a variable's time series at a point.

        Args:
            lat: Latitude.
            lon: Longitude.
            start: Start date-time (UTC).
            end: End date-time (UTC).
            variable: Collection variable; defaults to `VARIABLE`.

        Returns:
            Columns time and `variable`; metadata (units...) in `.attrs`.
        """
        lat, lon = base.check_point(lat, lon)
        variable = base.check_name(variable or self.VARIABLE)
        params = {
            'data': f'{self.COLLECTION}_{variable}',
            'location': f'[{round(lat, 4)},{round(lon, 4)}]',
            'time': f'{base.date(start, "%Y-%m-%dT%H:%M:%S")}/'
                    f'{base.date(end, "%Y-%m-%dT%H:%M:%S")}',
        }
        lines = (await self._text('GET', 'timeseries',
                                  params=params)).splitlines()
        meta = dict(line.split(',', 1) for line in lines[:self._HEADER_LINES]
                    if ',' in line)
        if len(lines) <= self._HEADER_LINES or 'param_name' not in meta:
            raise base.DatasetError(f'Giovanni returned no data for {params}.')
        frame = pd.read_csv(
            io.StringIO('\n'.join(lines[self._HEADER_LINES:])), header=1,
            names=['time', variable], parse_dates=['time'])
        frame.attrs = {k: v.strip() for k, v in meta.items()}
        return frame


class SMAP(AppEEARS):
    """SMAP enhanced L3 soil moisture (9 km) and freeze/thaw state."""

    SHORT_NAME = 'SPL3SMP_E'
    PRODUCT = 'SPL3SMP_E.006'
    LAYERS = ('Soil_Moisture_Retrieval_Data_AM_soil_moisture',
              'Soil_Moisture_Retrieval_Data_PM_soil_moisture_pm')

    async def freeze_thaw(self, lat: float, lon: float, start,
                          end) -> pd.DataFrame:
        """Returns the SMAP freeze/thaw state (0 thawed, 1 frozen)."""
        layer = 'Freeze_Thaw_Retrieval_Data_Global_freeze_thaw'
        return await self.point(lat, lon, start, end, product='SPL3FTP.004',
                                layers=[layer])


class Landsat(AppEEARS):
    """Harmonized Landsat (HLS L30, 30 m) vegetation indices."""

    SHORT_NAME = 'HLSL30'
    PRODUCT = 'HLSL30_VI.020'
    LAYERS = ('NDVI', 'EVI', 'NDMI')


class MODIS(AppEEARS):
    """MODIS Terra 16-day 250 m vegetation indices (MOD13Q1)."""

    SHORT_NAME = 'MOD13Q1'
    PRODUCT = 'MOD13Q1.061'
    LAYERS = ('_250m_16_days_NDVI', '_250m_16_days_EVI')


class VIIRS(AppEEARS):
    """VIIRS SNPP 16-day 500 m vegetation indices (VNP13A1)."""

    SHORT_NAME = 'VNP13A1'
    PRODUCT = 'VNP13A1.002'
    LAYERS = ('500_m_16_days_NDVI', '500_m_16_days_EVI')


class ECOSTRESS(AppEEARS):
    """ECOSTRESS 70 m land surface temperature and evapotranspiration."""

    SHORT_NAME = 'ECO_L2T_LSTE'
    PRODUCT = 'ECO_L2T_LSTE.002'
    LAYERS = ('LST', 'QC')

    async def evapotranspiration(self, lat: float, lon: float, start,
                                 end) -> pd.DataFrame:
        """Returns daily ET (mm/day) from the L3 JET ensemble."""
        return await self.point(lat, lon, start, end,
                                product='ECO_L3T_JET.002', layers=['ETdaily'])


class GPM(Giovanni):
    """GPM IMERG V07 Final precipitation (half-hourly, 0.1 deg, mm/hr)."""

    SHORT_NAME = 'GPM_3IMERGDF'
    COLLECTION = 'GPM_3IMERGHH_07'
    VARIABLE = 'precipitation'


class NLDAS(Giovanni):
    """NLDAS-2 hourly forcing, 0.125 deg, North America."""

    SHORT_NAME = 'NLDAS_FORA0125_H'
    COLLECTION = 'NLDAS_FORA0125_H_2_0'
    VARIABLE = 'Tair'


class GLDAS(Giovanni):
    """GLDAS Noah 3-hourly land surface model, 0.25 deg, global."""

    SHORT_NAME = 'GLDAS_NOAH025_3H'
    COLLECTION = 'GLDAS_NOAH025_3H_2_1'
    VARIABLE = 'SoilMoi0_10cm_inst'


class GEDI(Earthdata):
    """GEDI L4A footprint above-ground biomass density."""

    SHORT_NAME = 'GEDI_L4A_AGB_Density_V3_2508'

    async def footprints(self, bbox: base.Bbox, start, end) -> pd.DataFrame:
        """Returns biomass footprints in `bbox` (needs HDF5 bulk download)."""
        return base.bulk(bbox, start, end)


async def _token(http: aiohttp.ClientSession, url: str,
                 credentials: tuple[str, ...], key: str) -> str:
    """Exchanges Earthdata username and password for a bearer token."""
    username, password = credentials
    async with http.post(base.check_url(url),
                         auth=aiohttp.BasicAuth(username, password),
                         timeout=aiohttp.ClientTimeout(total=60)) as response:
        if response.status != 200:
            raise PermissionError(
                f'Earthdata login failed: HTTP {response.status}.')
        return (await response.json(content_type=None))[key]
