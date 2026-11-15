"""Monthly NASA POWER history and GEOS-S2S forecasts of a region."""

import dataclasses
import warnings
from pathlib import Path

import aiohttp
import numpy as np
import pandas as pd

import agdata as ag

TARGETS = ('T2M', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'RH2M', 'GWETROOT')
# Inputs only: surface and full-profile soil wetness.
VARIABLES = (*TARGETS, 'GWETTOP', 'GWETPROF')
HISTORY_START = pd.Timestamp('1981-01-01')  # First year of POWER weather.
GEOS_START = pd.Timestamp('2018-01-01')  # GEOS-S2S on CPC starts 2018-04.
_RADIATION = 'ALLSKY_SFC_SW_DWN'


@dataclasses.dataclass(frozen=True)
class Region:
    """History of a region: the `X` of the outlook estimators.

    Attributes:
        power: Monthly POWER values of the complete months in the range:
            time, lat, lon and one column per variable. Radiation is NaN
            where not yet published.
        geos: GEOS-S2S anomalies usable at each forecast date up to `origin`:
            glat, glon (1-degree nodes), origin, target, geos_prate (mm/day)
            and geos_tmp2m (K).
        origin: The forecast date: the month after the last complete month.
    """

    power: pd.DataFrame
    geos: pd.DataFrame
    origin: pd.Timestamp


async def fetch_region(bbox: ag.base.Bbox, start=HISTORY_START, end=None,
                       cache_dir: Path | None = None) -> Region:
    """Downloads the history of a region: the `X` of the estimators.

    Args:
        bbox: (west, south, east, north), up to 10 degrees per side. The
            estimators pool all its cells: a few degrees (about 100 POWER
            cells) give them enough independent months to learn from.
        start: First month of history, from 1981. Normals come from the
            whole history, so decades give stable ones.
        end: Last day of history, default today. Forecasts start the month
            after the last complete month up to it, so a past date gives the
            outlook as it would have been then.
        cache_dir: Directory caching GEOS-S2S forecasts, which take minutes
            to download; None downloads them every time.

    Raises:
        ValueError: Invalid bbox or date range.
        agdata.DatasetError: The data are incomplete or invalid.
    """
    bbox = ag.base.check_bbox(bbox)
    start = pd.Timestamp(start).to_period('M').to_timestamp()
    end = pd.Timestamp.today() if end is None else pd.Timestamp(end)
    end = end.normalize()
    if start < HISTORY_START or end <= start:
        raise ValueError(f'Invalid range {start.date()} to {end.date()}: it '
                         f'must start from {HISTORY_START.date()}.')
    async with aiohttp.ClientSession() as http:
        power = await _power(ag.NasaPower(http), bbox, start, end)
        power = _regrid_radiation(power)
        origin = power.time.max() + pd.DateOffset(months=1)
        geos = await _geos(ag.NMME(http), bbox, origin, cache_dir)
    return Region(power, geos, origin)


async def _power(api: ag.NasaPower, bbox, start: pd.Timestamp,
                 end: pd.Timestamp) -> pd.DataFrame:
    """Returns the complete months from `start` to `end`."""
    monthly = await api.area(bbox, start, end, parameters=VARIABLES,
                             resolution='monthly')
    monthly = monthly[~monthly.time.str.endswith('13')]  # 13: annual mean.
    monthly = monthly.assign(time=pd.to_datetime(monthly.time, format='%Y%m'))
    # The API returns whole years: keep the months of the range.
    monthly = monthly[(monthly.time >= start)
                      & (monthly.time + pd.offsets.MonthEnd(0) <= end)]
    # Monthly values lag by months: complete them from daily values.
    gap = min(monthly.dropna(subset=[v]).time.max()
              for v in VARIABLES) + pd.DateOffset(months=1)
    if gap + pd.offsets.MonthEnd(0) > end:
        return monthly
    daily = await api.area(bbox, gap, end, parameters=VARIABLES,
                           resolution='daily')
    daily['time'] = daily.time.dt.to_period('M').dt.to_timestamp()
    days = daily.groupby(['time', 'lat', 'lon'])[list(VARIABLES)]
    counts = days.count()
    whole = counts.eq(counts.index.get_level_values('time').days_in_month,
                      axis=0)
    recent = days.mean().where(whole).reset_index()
    # `first` keeps the monthly value where both exist.
    return (pd.concat([monthly, recent])
            .groupby(['time', 'lat', 'lon']).first().reset_index())


def _regrid_radiation(power: pd.DataFrame) -> pd.DataFrame:
    """Gives each MERRA-2 cell the radiation of its 1-degree CERES cell.

    POWER serves radiation on a 1-degree grid (centers at x.5) and the
    other variables on a 0.5 x 0.625-degree grid. Keeps only months where
    all other variables are complete.
    """
    radiation = power.dropna(subset=[_RADIATION])[
        ['time', 'lat', 'lon', _RADIATION]]
    others = [v for v in VARIABLES if v != _RADIATION]
    power = power.dropna(subset=['T2M']).drop(columns=_RADIATION)
    power = power[power.time <= power.dropna(subset=others)
                  .groupby(['lat', 'lon']).time.max().min()]
    if power[others].isna().any().any():
        raise ag.DatasetError('NASA POWER: gaps in the monthly history.')
    wetness = power[['GWETROOT', 'GWETTOP', 'GWETPROF']]
    if not (wetness.stack().between(0, 1).all()
            and power.RH2M.between(0, 100).all()
            and (power.PRECTOTCORR >= 0).all()
            and (radiation[_RADIATION] >= 0).all()):
        raise ag.DatasetError('NASA POWER: values out of physical range.')
    power = power.assign(
        rlat=(np.floor(power.lat) + 0.5).clip(radiation.lat.min(),
                                              radiation.lat.max()),
        rlon=(np.floor(power.lon) + 0.5).clip(radiation.lon.min(),
                                              radiation.lon.max()))
    return (power.merge(radiation.rename(columns={'lat': 'rlat',
                                                  'lon': 'rlon'}),
                        on=['time', 'rlat', 'rlon'], how='left')
            .drop(columns=['rlat', 'rlon'])
            .sort_values(['lat', 'lon', 'time'], ignore_index=True))


async def _geos(api: ag.NMME, bbox, origin: pd.Timestamp,
                cache_dir: Path | None) -> pd.DataFrame:
    """Returns the GEOS-S2S forecasts issued before `origin`.

    The cache holds every issue since `GEOS_START`; only newer ones are
    downloaded.
    """
    last = origin - pd.DateOffset(months=1)  # Issued the month before.
    path = cache_dir and Path(cache_dir) / (
        'geos_' + '_'.join(f'{v:g}' for v in bbox) + '.parquet')
    geos = pd.read_parquet(path) if path and path.exists() else None
    first = (GEOS_START if geos is None
             else geos.issued.max() + pd.DateOffset(months=1))
    if first <= last:
        new = await api.area(bbox, first, last)
        geos = new if geos is None else pd.concat([geos, new],
                                                  ignore_index=True)
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            geos.to_parquet(path)
    columns = ['glat', 'glon', 'origin', 'target', 'geos_prate', 'geos_tmp2m']
    if geos is None:  # The range ends before GEOS-S2S started.
        return pd.DataFrame(columns=columns)
    geos = geos[geos.issued <= last]
    if last >= GEOS_START and not (geos.issued == last).any():
        warnings.warn(f'No GEOS-S2S forecast issued {last:%Y-%m}: this '
                      f'outlook uses history only.', stacklevel=3)
    return pd.DataFrame({
        'glat': geos.lat, 'glon': geos.lon,
        'origin': geos.issued + pd.DateOffset(months=1),
        'target': geos.target,
        'geos_prate': geos.prate * 86400,  # mm/s -> mm/day.
        'geos_tmp2m': geos.tmp2m,
    })[columns]
