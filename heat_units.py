"""Observed growing-degree-day (GDD) summaries, *not* crop-yield prediction.

Tbase entries originate in gdd_profiles.csv. No unverified maturity targets
are invented. Uses the mean of daily Tmin and Tmax as a transparent proxy.
"""
from __future__ import annotations
import csv
from pathlib import Path
import math
import pandas as pd


def load_gdd_profiles(path: Path) -> dict[str, dict]:
    profiles = {}
    with path.open(encoding='utf-8-sig', newline='') as fh:
        reader = csv.DictReader(fh)
        if not {'crop', 'base_temperature_f'}.issubset(reader.fieldnames or []):
            raise ValueError('GDD CSV needs crop and base_temperature_f')
        for row in reader:
            crop = (row['crop'] or '').strip().casefold()
            if not crop or crop in profiles:
                raise ValueError(f'Empty/duplicate GDD crop: {crop!r}')
            text = (row['base_temperature_f'] or '').strip()
            if text:
                base_f = float(text)
                if not math.isfinite(base_f) or not -10 <= base_f <= 90:
                    raise ValueError(f'Invalid Tbase for {crop}: {text}')
                base_c = (base_f - 32.0) * 5.0 / 9.0
            else:
                base_c = None
            profiles[crop] = {'base_c': base_c, 'source': row.get('source', '')}
    return profiles


def evaluate_gdd(crop: str, daily: pd.DataFrame, start_year: int, end_year: int,
                 profiles: dict[str, dict], season: dict) -> tuple[str, str, dict]:
    profile = profiles.get(crop.casefold())
    if profile is None:
        return 'not_applicable', '', {}
    base = profile['base_c']
    if base is None:
        return 'needs_review', (f'Для {crop} немає підтвердженої базової температури GDD; '
                                'оцінку накопиченого тепла не виконано.'), {'status': 'base_unknown'}
    historical = season.get('historical_years') or []
    year_results = []
    for year in range(start_year, end_year + 1):
        frost = next((r for r in historical if r['year'] == year), None)
        if not frost or not frost.get('season_start') or not frost.get('season_end'):
            return 'needs_review', 'Немає визначених меж безморозного сезону для GDD.', {'status': 'insufficient_season'}
        start = pd.Timestamp(frost['season_start'])
        end = pd.Timestamp(frost['season_end'])
        if end < start:
            return 'needs_review', 'Некоректний інтервал безморозного сезону.', {'status': 'insufficient_season'}
        frame = daily.reindex(pd.date_range(start, end, freq='D'))
        required = {'min_temperature_c', 'max_temperature_c'}
        if not required.issubset(frame.columns) or frame[list(required)].isna().any().any():
            return 'needs_review', f'Не вистачає Tmax/Tmin за {year} для GDD.', {'status': 'missing_temperature'}
        means = (frame['min_temperature_c'] + frame['max_temperature_c']) / 2.0
        gdd = (means - base).clip(lower=0).sum()
        year_results.append({'year':year, 'start_date':start.date().isoformat(),
                             'end_date':end.date().isoformat(),
                             'days':len(frame), 'gdd_c_days':round(float(gdd),1),
                             'days_above_base':int((means > base).sum())})
    data = {'status':'calculated', 'base_temperature_c':round(base,3),
            'source':profile['source'], 'historical_years':year_results,
            'maturity_gdd_requirement_c_days':None,
            'method':'sum(max(0,(Tmax+Tmin)/2 - Tbase)) across estimated frost-free days'}
    vals = [v['gdd_c_days'] for v in year_results]
    return 'allowed', (f'GDD (Tbase={base:.1f} °C) за {len(vals)} сезонів: '
                       f'{min(vals):.0f}–{max(vals):.0f} °C·днів. '
                       'Без перевіреної цільової суми GDD це лише показник тепла, '
                       'не оцінка придатності.'), data
