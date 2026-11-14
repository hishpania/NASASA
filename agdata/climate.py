"""Climate datasets: NASA POWER, PRISM and CoCoRaHS."""

import io
from typing import ClassVar, Sequence

import pandas as pd

from agdata import base


class NasaPower(base.Dataset):
    """NASA POWER agroclimatology: temperature, humidity, radiation, rain."""

    BASE_URL = 'https://power.larc.nasa.gov/api/temporal/'
    PARAMETERS: ClassVar[tuple[str, ...]] = (
        'T2M', 'T2M_MAX', 'T2M_MIN', 'RH2M', 'PRECTOTCORR',
        'ALLSKY_SFC_SW_DWN', 'WS2M', 'EVPTRNS')
    _FORMATS: ClassVar[dict[str, tuple[str, str]]] = {  # (request, index)
        'hourly': ('%Y%m%d', '%Y%m%d%H'),
        'daily': ('%Y%m%d', '%Y%m%d'),
        'monthly': ('%Y', ''),
    }

    async def point(self, lat: float, lon: float, start, end,
                    parameters: Sequence[str] | None = None,
                    resolution: str = 'daily') -> pd.DataFrame:
        """Returns a time series of POWER parameters at a point.

        Args:
            lat: Latitude.
            lon: Longitude.
            start: Start date.
            end: End date.
            parameters: POWER parameter codes; defaults to `PARAMETERS`.
            resolution: 'hourly', 'daily' or 'monthly' (month 13 = annual).

        Returns:
            One column per parameter, indexed by time; units in `.attrs`.
        """
        if resolution not in self._FORMATS:
            raise ValueError(f'Resolution not in {list(self._FORMATS)}.')
        request_fmt, index_fmt = self._FORMATS[resolution]
        return await self._fetch(f'{resolution}/point', lat, lon, parameters, {
            'start': base.date(start, request_fmt),
            'end': base.date(end, request_fmt),
        }, index_fmt)

    async def climatology(self, lat: float, lon: float,
                          parameters: Sequence[str] | None = None
                          ) -> pd.DataFrame:
        """Returns long-term monthly means (JAN..DEC, ANN) at a point."""
        return await self._fetch('climatology/point', lat, lon, parameters,
                                 {})

    async def _fetch(self, path, lat, lon, parameters, params, index_fmt=''):
        lat, lon = base.check_point(lat, lon)
        names = [base.check_name(p) for p in parameters or self.PARAMETERS]
        data = await self._json('GET', path, params={
            **params, 'latitude': lat, 'longitude': lon, 'community': 'AG',
            'parameters': ','.join(names), 'format': 'JSON'})
        frame = pd.DataFrame(data['properties']['parameter'])
        frame = frame.replace(data['header']['fill_value'], float('nan'))
        if index_fmt:
            frame.index = pd.to_datetime(frame.index, format=index_fmt)
        frame.attrs = {k: v['units'] for k, v in data['parameters'].items()}
        return frame


class PRISM(base.Dataset):
    """PRISM US climate grids (Oregon State University).

    The web service serves zipped grids with per-file daily download limits,
    so access is left unimplemented for now.
    """

    BASE_URL = 'https://services.nacse.org/prism/data/get/us/'

    async def daily(self, variable: str, start, end) -> pd.DataFrame:
        """Daily grids of ppt, tmin, tmax, tmean, tdmean, vpdmin, vpdmax."""
        return base.bulk(variable, start, end)

    async def monthly(self, variable: str, start, end) -> pd.DataFrame:
        """Monthly grids."""
        return base.bulk(variable, start, end)

    async def normals(self, variable: str) -> pd.DataFrame:
        """30-year (1991-2020) normals."""
        return base.bulk(variable)


class CoCoRaHS(base.Dataset):
    """CoCoRaHS crowd-sourced daily precipitation and snow reports."""

    BASE_URL = 'https://data.cocorahs.org/export/exportreports.aspx'

    async def daily(self, state: str, start, end,
                    county: str | None = None) -> pd.DataFrame:
        """Returns daily reports of a state (and county), e.g. 'IA'.

        Precipitation 'T' means trace; 'NA' is missing.
        """
        params = {
            'ReportType': 'Daily', 'dtf': 1, 'Format': 'CSV',
            'State': base.check_name(state, r'[A-Za-z]{2}'),
            'ReportDateType': 'reportdate',
            'StartDate': base.date(start, '%m/%d/%Y'),
            'EndDate': base.date(end, '%m/%d/%Y'),
        }
        if county:
            params['County'] = base.check_name(county, r'[A-Za-z]{1,3}')
        return pd.read_csv(io.StringIO(await self._text('GET', params=params)),
                           skipinitialspace=True,
                           parse_dates=['ObservationDate'])
