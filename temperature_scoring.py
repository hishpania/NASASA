"""Crop-specific historical temperature scoring for Field Shift.

For crops explicitly present in growing_season_profiles.csv, use the entire
frost-free interval observed in each year instead of one shared May-Sep window.
Use EcoCrop temperature limits and the project's existing range_score curve.
This is still a regional proxy, not a planting calendar / phenology forecast.
"""
from __future__ import annotations

import math

import pandas as pd

from climate_scoring import RangeRequirement, range_score


def score_frost_free_temperature(crop: str, row: pd.Series, daily: pd.DataFrame,
                                  growing_season: dict) -> dict:
    """Return {'score', 'historical_years', 'summary', 'warning'}.

    Needs a complete identified or calendar-year-censored window in EVERY year; never silently substitute an
    unrelated May-Sep score for missing data. The frost dates themselves are
    excluded from the temperature average.
    """
    keys = ('tmin', 'topmn', 'topmx', 'tmax')
    limits = [pd.to_numeric(row.get(k), errors='coerce') for k in keys]
    if any(pd.isna(v) or not math.isfinite(float(v)) for v in limits):
        return {'score': None, 'historical_years': [],
                'warning': f'{crop}: відсутні температурні межі ECOCROP.'}
    try:
        limits_obj = RangeRequirement(*map(float, limits))
    except ValueError as exc:
        return {'score': None, 'historical_years': [], 'warning': f'{crop}: {exc}'}

    windows = growing_season.get('historical_years', [])
    if not windows:
        return {'score': None, 'historical_years': [],
                'warning': f'{crop}: немає визначених безморозних періодів.'}
    records = []
    for window in windows:
        if not window.get('season_start') or not window.get('season_end'):
            return {'score': None, 'historical_years': records,
                    'warning': f"{crop}: межі безморозного сезону {window.get('year')} невідомі."}
        start = pd.Timestamp(window['season_start'])
        end = pd.Timestamp(window['season_end'])
        if start > end:
            return {'score': None, 'historical_years': records,
                    'warning': f"{crop}: порожній безморозний період {window.get('year')}."}
        values = daily.reindex(pd.date_range(start, end, freq='D'))['temperature_c']
        if values.isna().any():
            return {'score': None, 'historical_years': records,
                    'warning': f"{crop}: неповні температурні дані {window.get('year')}."}
        mean_c = float(values.mean())
        records.append({
            'year': int(window['year']),
            'from': start.date().isoformat(),
            'to': end.date().isoformat(),
            'days': int(len(values)),
            'mean_temperature_c': round(mean_c, 2),
            'temperature_score': round(range_score(mean_c, limits_obj), 2),
        })
    score = round(sum(r['temperature_score'] for r in records) / len(records), 2)
    observed = [r['mean_temperature_c'] for r in records]
    return {
        'score': score,
        'historical_years': records,
        'summary': (
            f'Температура за безморозний період ({len(records)} років): '
            f'{min(observed):.1f}–{max(observed):.1f} °C; '
            f'ECOCROP оптимум {float(limits[1]):g}–{float(limits[2]):g} °C; '
            f'оцінка {score:.1f}/100.'
        ),
        'warning': ('Усереднення за всім історичним безморозним періодом — наближення. '
                    'Це не точна дата висіву, не температура в конкретні фази росту '
                    'і не прогноз урожаю.'),
    }
