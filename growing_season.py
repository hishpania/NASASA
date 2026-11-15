"""Historical outdoor frost-free season screening for explicitly selected crops.

NASA POWER min_temperature_c is gridded 2-m air temperature; this is an
approximate screening metric, not a measured field frost date or forecast.
"""
from __future__ import annotations

import csv
from pathlib import Path
import pandas as pd


def load_profiles(path: Path) -> dict[str, float]:
    profiles = {}
    with path.open(encoding='utf-8-sig', newline='') as stream:
        for record in csv.DictReader(stream):
            crop = (record.get('crop') or '').strip().casefold()
            if not crop or crop in profiles:
                raise ValueError(f'Invalid or duplicate crop in {path}: {crop!r}')
            threshold = float(record['frost_threshold_c'])
            if not -10 <= threshold <= 15:
                raise ValueError(f'Unreasonable frost threshold for {crop}: {threshold}')
            profiles[crop] = threshold
    return profiles


def yearly_frost_free_days(daily: pd.DataFrame, year: int, threshold_c: float) -> dict:
    """Estimate the longest Jan-Dec frost-free window around summer.

    No detected spring/autumn frost is a *valid observation*, not missing data.
    When a frost boundary is absent, use Jan 1 or Dec 31 and explicitly mark
    that the actual season may continue into the adjacent year.
    """
    idx = pd.date_range(f'{year}-01-01', f'{year}-12-31', freq='D')
    values = daily.reindex(idx)['min_temperature_c']
    if values.isna().any():
        return {'year': year, 'frost_free_days': None,
                'reason': 'Неповні щоденні дані мінімальної температури.'}
    spring = values.loc[:f'{year}-06-30']
    autumn = values.loc[f'{year}-07-01':]
    last_spring = spring.index[spring < threshold_c]
    first_fall = autumn.index[autumn < threshold_c]
    spring_date = last_spring[-1] if len(last_spring) else None
    fall_date = first_fall[0] if len(first_fall) else None
    season_start = (spring_date + pd.Timedelta(days=1) if spring_date is not None
                    else idx[0])
    season_end = (fall_date - pd.Timedelta(days=1) if fall_date is not None
                  else idx[-1])
    days = max(0, (season_end - season_start).days + 1)
    if days == 0:
        return {'year': year, 'frost_free_days': None,
                'reason': 'Немає коректного інтервалу між заморозками.'}
    return {
        'year': year,
        'frost_free_days': int(days),
        'last_spring_frost': spring_date.date().isoformat() if spring_date is not None else None,
        'first_fall_frost': fall_date.date().isoformat() if fall_date is not None else None,
        'season_start': season_start.date().isoformat(),
        'season_end': season_end.date().isoformat(),
        'no_spring_frost_observed': spring_date is None,
        'no_fall_frost_observed': fall_date is None,
        'year_boundary_censored': spring_date is None or fall_date is None,
    }


def evaluate_growing_season(crop: str, row: pd.Series, daily: pd.DataFrame,
                            start_year: int, end_year: int,
                            profiles: dict[str, float]) -> tuple[str, str, dict]:
    """Return (allowed/excluded/needs_review/not_applicable, reason, stats).

    Hard-exclude only when *all* observed completed years have a shorter
    estimated frost-free period than EcoCrop minimum growth duration. No
    custom planting date is assumed; crops using transplants/greenhouses,
    overwintering, and multiple harvests require separate calendars.
    """
    threshold = profiles.get(crop.casefold())
    if threshold is None:
        return 'not_applicable', 'Немає профілю теплолюбної сезонної культури.', {}
    gmin = pd.to_numeric(row.get('gmin'), errors='coerce')
    if pd.isna(gmin) or not 0 < float(gmin) <= 366:
        return 'needs_review', 'Немає коректного ECOCROP gmin (мінімальна кількість днів росту).', {}
    minimum_days = int(float(gmin))
    years = [yearly_frost_free_days(daily, year, threshold)
             for year in range(start_year, end_year + 1)]
    lengths = [item['frost_free_days'] for item in years]
    meta = {'frost_threshold_c': threshold,
            'ecocrop_minimum_growing_days': minimum_days,
            'historical_years': years,
            'method': 'last Jan-Jun frost to first Jul-Dec frost; missing frost boundary uses Jan 1/Dec 31 (calendar-year lower bound); gridded air Tmin'}
    if any(days is None for days in lengths):
        return 'needs_review', 'Неможливо надійно визначити безморозний період за всі роки; потрібна перевірка.', meta
    failed = sum(days < minimum_days for days in lengths)
    min_days, max_days = min(lengths), max(lengths)
    censored = sum(bool(x.get('year_boundary_censored')) for x in years)
    caveat = (f' У {censored} з {len(years)} років одна з меж заморозків відсутня; '
              'період обрізано календарним роком.' if censored else '')
    if failed == len(lengths):
        return 'excluded', (f'За всі {len(lengths)} років оцінений безморозний період був коротший '
                            f'за ECOCROP gmin={minimum_days} дн. (діапазон {min_days}–{max_days} дн.; '
                            'незахищене вирощування на відкритому ґрунті).' + caveat), meta
    if failed:
        return 'allowed', (f'Безморозний період {min_days}–{max_days} дн.; '
                           f'ECOCROP gmin={minimum_days} дн. У {failed} з {len(lengths)} років '
                           'період був закороткий — ризик для врожаю.' + caveat), meta
    return 'allowed', (f'Безморозний період {min_days}–{max_days} дн. за історією; '
                       f'ECOCROP gmin={minimum_days} дн. Довжини періоду достатньо, '
                       'але тепло/опади/строки посадки окремо не перевірені.' + caveat), meta
