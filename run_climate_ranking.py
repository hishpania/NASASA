"""Field Shift: NASA POWER + FAO ECOCROP temperature screening.

Run example:
 python run_climate_ranking.py --lat 50.45 --lon 30.52 --start-year 2020 --end-year 2025 --start-month 5 --end-month 9

This is a temperature-only prototype, NOT a full crop recommendation system.
The same manually chosen season is applied to every crop. FAO EcoCrop
requirements are broad expert estimates and are not phenological models.
"""
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path
import json

import pandas as pd

from nasa_power import fetch_daily
from ecocrop import read_ecocrop, score_crops_temperature

ROOT = Path(__file__).resolve().parent


def calculate_season_means(data: pd.DataFrame, start_year: int, end_year: int,
                           start_month: int, end_month: int) -> list[dict]:
    """One observation per completed calendar-year season; no partial means."""
    if not 1 <= start_month <= end_month <= 12:
        raise ValueError('For this MVP, start_month and end_month must be ordered within one calendar year.')
    out = []
    for year in range(start_year, end_year + 1):
        start = pd.Timestamp(date(year, start_month, 1))
        end = pd.Timestamp(date(year, end_month, 1)) + pd.offsets.MonthEnd(0)
        expected_dates = pd.date_range(start, end, freq='D')
        frame = data.reindex(expected_dates)
        if frame['temperature_c'].isna().any():
            missing = int(frame['temperature_c'].isna().sum())
            raise ValueError(f'Missing {missing} temperature observations for {year}; cannot score partial seasons.')
        precipitation_complete = frame['precipitation_mm_day'].notna().all()
        out.append({
            'year': year,
            'temperature_c': round(float(frame['temperature_c'].mean()), 3),
            'precipitation_mm': (round(float(frame['precipitation_mm_day'].sum()), 2)
                                 if precipitation_complete else None),
        })
    return out


def build_ranking(crops: pd.DataFrame, seasons: list[dict],
                  period_description: str) -> list[dict]:
    """Score each season per crop, then average scores (rather than averaging temps)."""
    crop_names = crops['crop'].tolist()
    by_crop = {name: [] for name in crop_names}
    for season in seasons:
        annual_scores = score_crops_temperature(
            crops, season['temperature_c'], period_description
        )
        for item in annual_scores:
            by_crop[item['crop']].append({'year': season['year'], **item})

    result = []
    for name in crop_names:
        records = by_crop[name]
        scores = [r['climate_score'] for r in records]
        if any(v is None for v in scores):
            result.append({
                'crop': name, 'temperature_score': None,
                'status': 'needs_review',
                'reasons': [],
                'warnings': sorted({w for r in records for w in r['warnings']}),
            })
            continue
        score = round(sum(scores) / len(scores), 2)
        reasons = [
            f'Temperature score averaged across {len(scores)} seasons: {score:.2f}/100',
            f'Observed mean temperatures ranged from '
            f'{min(s["temperature_c"] for s in seasons):.1f} to '
            f'{max(s["temperature_c"] for s in seasons):.1f} °C',
        ]
        result.append({
            'crop': name, 'temperature_score': score,
            'status': 'temperature_screening_only',
            'reasons': reasons,
            'warnings': ['No soil, precipitation suitability, crop rotation, irrigation, or future weather included.'],
            'yearly_temperature_scores': [
                {'year': r['year'], 'score': r['climate_score']} for r in records
            ],
        })
    return sorted(result, key=lambda r: (
        r['temperature_score'] is None,
        -(r['temperature_score'] if r['temperature_score'] is not None else -1),
        r['crop'],
    ))


def main() -> None:
    parser = argparse.ArgumentParser(description='Temperature-only crop screening using NASA POWER and ECOCROP')
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lon', type=float, required=True)
    parser.add_argument('--start-year', type=int, default=2020)
    parser.add_argument('--end-year', type=int, default=2025)
    parser.add_argument('--start-month', type=int, default=5)
    parser.add_argument('--end-month', type=int, default=9)
    parser.add_argument('--crops', type=Path, default=ROOT / 'crop_database.csv')
    args = parser.parse_args()
    if args.start_year > args.end_year or not (1 <= args.start_month <= args.end_month <= 12):
        parser.error('Invalid year range or month range (only seasons within a calendar year).')
    if args.end_year >= date.today().year:
        parser.error('Use complete historical calendar years, not the current/future year.')
    if not args.crops.exists():
        parser.error(f'Crop CSV not found: {args.crops}. Run prepare_crop_database.py first.')

    crops = read_ecocrop(args.crops)
    start_date = f'{args.start_year}{args.start_month:02d}01'
    last_day = pd.Timestamp(date(args.end_year, args.end_month, 1)) + pd.offsets.MonthEnd(0)
    end_date = last_day.strftime('%Y%m%d')
    print(f'Loading NASA POWER: {args.lat}, {args.lon}; {start_date}–{end_date}')
    observations = fetch_daily(args.lat, args.lon, start_date, end_date)
    seasons = calculate_season_means(observations, args.start_year, args.end_year,
                                     args.start_month, args.end_month)
    period = f'months {args.start_month}-{args.end_month}, historical years {args.start_year}-{args.end_year}'
    ranking = build_ranking(crops, seasons, period)
    result = {
        'location': {'latitude': args.lat, 'longitude': args.lon},
        'period': period,
        'season_statistics': seasons,
        'ranking': ranking,
        'limitations': [
            'Rank is ONLY a retrospective temperature screening, not a planting recommendation.',
            'EcoCrop optimum temperature is compared to the chosen common seasonal mean as a prototype heuristic.',
            'Crop calendars and winter crops can differ; the selected months may be inappropriate for some crops.',
            'Rainfall is reported but NOT scored: EcoCrop rainfall bounds are annual.',
            'NASA POWER grid estimates are not measurements on the field.',
        ],
    }
    output = ROOT / 'climate_ranking.json'
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('\nTEMPERATURE-ONLY RANKING (NOT FINAL RECOMMENDATIONS)')
    for position, item in enumerate(ranking, 1):
        value = item['temperature_score']
        print(f'{position}. {item["crop"]:<12} {value if value is not None else "N/A"}/100')
        for explanation in item['reasons']:
            print(f'   - {explanation}')
        for warning in item['warnings']:
            print(f'   ! {warning}')
    print(f'\nSaved: {output}')


if __name__ == '__main__':
    main()
