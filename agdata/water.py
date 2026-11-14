"""Water datasets: USGS NWIS and OpenET."""

from typing import ClassVar

import pandas as pd

from agdata import base


class NWIS(base.Dataset):
    """USGS National Water Information System (Water Data OGC API).

    An optional api.data.gov key (`USGS_API_KEY`) raises rate limits.
    """

    BASE_URL = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/'
    CREDENTIALS = ('USGS_API_KEY',)
    CREDENTIALS_OPTIONAL = True
    MAX_PAGES: ClassVar[int] = 100

    @classmethod
    async def _authorize(cls, http, credentials):
        return {'headers': {'X-Api-Key': credentials[0]}}

    async def sites(self, bbox: base.Bbox, site_type: str | None = None,
                    **filters) -> pd.DataFrame:
        """Returns monitoring locations in a bbox.

        Args:
            bbox: (west, south, east, north).
            site_type: Site type code, e.g. 'ST' (stream), 'GW' (well).
            **filters: Other monitoring-locations properties.
        """
        if site_type:
            filters['site_type_code'] = base.check_name(site_type)
        return await self.items(
            'monitoring-locations',
            bbox=','.join(map(str, base.check_bbox(bbox))), **filters)

    async def daily(self, site: str, start, end,
                    parameter: str = '00060') -> pd.DataFrame:
        """Returns daily values of a site.

        Args:
            site: Site number ('05464500') or id ('USGS-05464500').
            start: Start date.
            end: End date.
            parameter: Parameter code: 00060 discharge (ft3/s), 00065 gage
                height (ft), 72019 depth to groundwater (ft), 00010 water
                temperature (C).
        """
        site = base.check_name(site, r'[\w-]+')
        frame = await self.items(
            'daily', monitoring_location_id=site if '-' in site
            else f'USGS-{site}',
            parameter_code=base.check_name(parameter, r'\d{5}'),
            time=f'{base.date(start)}/{base.date(end)}')
        if not frame.empty:
            frame['time'] = pd.to_datetime(frame['time'])
            frame['value'] = pd.to_numeric(frame['value'])
            frame = frame.sort_values('time', ignore_index=True)
        return frame

    async def items(self, collection: str, **params) -> pd.DataFrame:
        """Returns all features of any OGC API collection, following pages."""
        url = base.check_name(collection) + '/items'
        params = {**params, 'f': 'json', 'limit': 10000}
        rows = []
        for _ in range(self.MAX_PAGES):
            # Next links carry the query and stay on the NWIS host.
            data = await self._json('GET', url, params=params)
            rows += [f['properties'] for f in data.get('features', [])]
            url = next((l['href'] for l in data.get('links', [])
                        if l.get('rel') == 'next'), None)
            if not url:
                break
            params = None
        return pd.DataFrame(rows)


class OpenET(base.Dataset):
    """OpenET field-scale evapotranspiration (western US)."""

    BASE_URL = 'https://openet-api.org/'
    CREDENTIALS = ('OPENET_API_KEY',)

    @classmethod
    async def _authorize(cls, http, credentials):
        return {'headers': {'Authorization': credentials[0]}}

    async def point(self, lat: float, lon: float, start, end,
                    interval: str = 'monthly', model: str = 'Ensemble',
                    variable: str = 'ET') -> pd.DataFrame:
        """Returns an ET time series at a point (mm).

        Args:
            lat: Latitude.
            lon: Longitude.
            start: Start date.
            end: End date.
            interval: 'daily' or 'monthly'.
            model: Ensemble, SSEBop, eeMETRIC, SIMS, PTJPL, geeSEBAL, DisALEXI.
            variable: ET, ETo, ETof, NDVI or PR.
        """
        lat, lon = base.check_point(lat, lon)
        body = {
            'date_range': [base.date(start), base.date(end)],
            'interval': base.check_name(interval, 'daily|monthly'),
            'geometry': [lon, lat],
            'model': base.check_name(model),
            'variable': base.check_name(variable),
            'reference_et': 'gridMET',
            'units': 'mm',
            'file_format': 'JSON',
        }
        return pd.DataFrame(
            await self._json('POST', 'raster/timeseries/point', json=body))
