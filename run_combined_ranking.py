"""Field Shift: combine historical temperature and soil-pH screenings.

Example:
 python run_combined_ranking.py --lat 50.45 --lon 30.52 --ph 6.8 --start-year 2020 --end-year 2025

IMPORTANT: preliminary, user-adjustable ranking; NOT validated planting advice.
Soil pH is user-supplied or obtained from SoilGrids; rotation is applied later.
"""
from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path

import pandas as pd

from ecocrop import read_ecocrop
from nasa_power import fetch_daily
from run_climate_ranking import build_ranking, calculate_season_means
from soil_scoring import rank_crops_by_soil_ph

ROOT = Path(__file__).resolve().parent


def combine_rankings(temperature_ranking: list[dict], soil_ranking: list[dict],
                     temperature_weight: float = 0.5) -> list[dict]:
    """Join named crops and compute scores only when both components are valid."""
    if not 0 <= temperature_weight <= 1:
        raise ValueError('temperature_weight must be between 0 and 1')
    if len({item['crop'] for item in temperature_ranking}) != len(temperature_ranking):
        raise ValueError('Duplicate crops in temperature ranking')
    if len({item['crop'] for item in soil_ranking}) != len(soil_ranking):
        raise ValueError('Duplicate crops in soil ranking')
    temp_by_crop = {item['crop']: item for item in temperature_ranking}
    soil_by_crop = {item['crop']: item for item in soil_ranking}
    result = []
    for crop in sorted(temp_by_crop.keys() | soil_by_crop.keys()):
        t = temp_by_crop.get(crop)
        s = soil_by_crop.get(crop)
        t_score = t.get('temperature_score') if t else None
        s_score = s.get('soil_score') if s else None
        # Replace stand-alone module disclaimers with composite-accurate limitations.
        # A climate-only module warning that says 'No soil' is no longer true here.
        climate_warnings = [w for w in (t.get('warnings', []) if t else ['Missing temperature data'])
                            if w != 'No soil, precipitation suitability, crop rotation, irrigation, or future weather included.']
        soil_warnings = [w for w in (s.get('warnings', []) if s else ['Missing soil data'])
                         if w != 'Heuristic pH-only score; no measured soil nutrients, texture, drainage, or crop-specific yield validation.']
        warnings = climate_warnings + soil_warnings + [
            'Only historical mean seasonal temperature and soil pH are scored; '
            'precipitation suitability, texture, irrigation and future weather are not scored.',
            'Soil pH suitability is heuristic; no field-specific yield validation.',
        ]
        reasons = (t.get('reasons', []) if t else []) + (s.get('reasons', []) if s else [])
        if t_score is None or s_score is None:
            score, status = None, 'needs_review'
        else:
            score = round(temperature_weight * t_score + (1 - temperature_weight) * s_score, 2)
            status = 'preliminary_screening'
        result.append({
            'crop': crop,
            'score': score,
            'temperature_score': t_score,
            'soil_ph_score': s_score,
            'status': status,
            'reasons': reasons,
            'warnings': warnings,
        })
    return sorted(result, key=lambda item: (item['score'] is None,
                                           -(item['score'] if item['score'] is not None else -1),
                                           item['crop']))


def main() -> None:
    parser = argparse.ArgumentParser(description='NASA POWER + ECOCROP temperature and soil pH ranking')
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lon', type=float, required=True)
    parser.add_argument('--ph', type=float, default=None, help='Optional measured soil pH; if omitted query SoilGrids WCS')
    parser.add_argument('--start-year', type=int, default=2020)
    parser.add_argument('--end-year', type=int, default=2025)
    parser.add_argument('--start-month', type=int, default=5)
    parser.add_argument('--end-month', type=int, default=9)
    parser.add_argument('--temperature-weight', type=float, default=0.5)
    parser.add_argument('--crops', type=Path, default=ROOT / 'crop_database.csv')
    args = parser.parse_args()
    if not -90 <= args.lat <= 90 or not -180 <= args.lon <= 180:
        parser.error('Invalid latitude/longitude')
    if args.start_year > args.end_year or not (1 <= args.start_month <= args.end_month <= 12):
        parser.error('Invalid year/month range; cross-year seasons are not supported')
    if args.end_year >= date.today().year:
        parser.error('Use complete historical calendar years')
    if not args.crops.is_file():
        parser.error(f'Crop CSV not found: {args.crops}; first run prepare_crop_database.py')
    if args.ph is not None and not 0 <= args.ph <= 14:
        parser.error('Soil pH must be 0..14')
    if not 0 <= args.temperature_weight <= 1:
        parser.error('Temperature weight must be 0..1')

    soil_source = 'user supplied / measured'
    if args.ph is None:
        from soilgrids import get_soil_ph
        soil_data = get_soil_ph(args.lat, args.lon)
        args.ph = soil_data['soil_ph']
        soil_source = soil_data['source'] + ' (' + soil_data['depth_cm'] + ' cm)'
        print(f"Estimated SoilGrids pH: {args.ph} ({soil_source})")
    crops = read_ecocrop(args.crops)
    start_date = f'{args.start_year}{args.start_month:02d}01'
    last_day = pd.Timestamp(date(args.end_year, args.end_month, 1)) + pd.offsets.MonthEnd(0)
    end_date = last_day.strftime('%Y%m%d')
    print(f'Fetching NASA POWER for ({args.lat}, {args.lon}), {start_date}–{end_date} ...')
    daily = fetch_daily(args.lat, args.lon, start_date, end_date)
    seasons = calculate_season_means(daily, args.start_year, args.end_year,
                                     args.start_month, args.end_month)
    period = f'months {args.start_month}-{args.end_month}; {args.start_year}-{args.end_year}'
    temperature = build_ranking(crops, seasons, period)
    soil = rank_crops_by_soil_ph(args.crops, args.ph)
    ranking = combine_rankings(temperature, soil, args.temperature_weight)

    output = {
        'coordinates': {'latitude': args.lat, 'longitude': args.lon},
        'soil_ph': args.ph,
        'soil_ph_source': soil_source,
        'period': period,
        'temperature_weight': args.temperature_weight,
        'soil_ph_weight': round(1-args.temperature_weight, 4),
        'season_statistics': seasons,
        'ranking': ranking,
        'limitations': [
            'Preliminary ranking only; not a recommendation of what to plant.',
            'Temperature scoring uses one user-defined calendar period for all crops.',
            'Soil pH is supplied by user or predicted by SoilGrids; suitability penalty is heuristic.',
            'NASA POWER estimates represent a coarse climate grid, not measurements at this field.',
            'Rainfall, water supply, management, crop rotation history, crop calendars and future forecasts are not scored.',
            'Weights are arbitrary defaults and require calibration or expert justification.',
        ],
    }
    output_path = ROOT / 'combined_ranking.json'
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')

    print('\nPRELIMINARY RANKING (TEMPERATURE + SOIL pH; NOT PLANTING ADVICE)')
    for index, item in enumerate(ranking, 1):
        score = f"{item['score']:.2f}" if item['score'] is not None else 'N/A'
        print(f"{index}. {item['crop']:<12} total={score}/100 | temperature={item['temperature_score']} | pH={item['soil_ph_score']}")
        for reason in item['reasons']:
            print('   -', reason)
        if item['status'] == 'needs_review':
            for warning in item['warnings']:
                print('   !', warning)
    print(f'\nSaved: {output_path}')


if __name__ == '__main__':
    main()
