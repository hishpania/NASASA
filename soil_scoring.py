"""Field Shift: transparent soil pH suitability screening.

Uses FAO EcoCrop *optimal* soil pH ranges from crop_database.csv.
This is an illustrative ranking heuristic, NOT a validated agronomic model.
It does not use SoilGrids yet: actual field pH must be supplied explicitly.
"""
from __future__ import annotations

from math import isfinite
from pathlib import Path
import pandas as pd


def score_soil_ph(ph: float, optimal_min: float, optimal_max: float,
                  penalty_per_ph: float = 25.0) -> dict:
    """Return a heuristic 0..100 score and explanation for a soil pH value.

    A value inside the EcoCrop optimum gets 100; outside loses 25 points
    per full pH unit of distance from the nearest optimum boundary.
    That penalty is a SOFTWARE DESIGN CHOICE, not an EcoCrop threshold.
    """
    values = (ph, optimal_min, optimal_max, penalty_per_ph)
    if not all(isfinite(float(x)) for x in values):
        raise ValueError('Soil pH and requirements must be finite numbers')
    if not 0 <= ph <= 14:
        raise ValueError('Soil pH must be between 0 and 14')
    if not 0 <= optimal_min <= optimal_max <= 14:
        raise ValueError('Invalid EcoCrop optimal soil pH interval')
    if penalty_per_ph < 0:
        raise ValueError('Penalty must be nonnegative')

    distance = max(optimal_min - ph, 0.0, ph - optimal_max)
    score = round(max(0.0, 100.0 - penalty_per_ph * distance), 2)
    if distance == 0:
        explanation = (f'pH {ph:g} is within the reported EcoCrop optimal '
                       f'range {optimal_min:g}–{optimal_max:g}.')
    else:
        explanation = (f'pH {ph:g} is {distance:g} pH units outside the reported '
                       f'EcoCrop optimum {optimal_min:g}–{optimal_max:g}.')
    return {'soil_score': score, 'reasons': [explanation],
            'warnings': ['Heuristic pH-only score; no measured soil nutrients, '
                         'texture, drainage, or crop-specific yield validation.']}


def rank_crops_by_soil_ph(crop_file: str | Path, ph: float) -> list[dict]:
    df = pd.read_csv(crop_file)
    required = {'crop', 'phopmn', 'phopmx'}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f'Missing columns in crop database: {sorted(missing)}')
    results = []
    for _, row in df.iterrows():
        crop = str(row['crop'])
        try:
            result = score_soil_ph(ph, float(row['phopmn']), float(row['phopmx']))
            results.append({'crop': crop, 'status': 'scored', **result})
        except (ValueError, TypeError) as exc:
            results.append({'crop': crop, 'status': 'needs_review', 'soil_score': None,
                            'reasons': [], 'warnings': [str(exc)]})
    return sorted(results, key=lambda r: (r['soil_score'] is None,
                                         -(r['soil_score'] or 0), r['crop']))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='ECOCROP pH-only soil suitability screening')
    parser.add_argument('--ph', type=float, required=True,
                        help='Local field soil pH measured by lab or supplied by user')
    parser.add_argument('--crops', type=Path,
                        default=Path(__file__).with_name('crop_database.csv'))
    args = parser.parse_args()
    if not args.crops.exists():
        parser.error(f'Crop CSV not found: {args.crops}')
    print('SOIL pH SCREENING ONLY — NOT A FULL CROP RECOMMENDATION')
    for rank, item in enumerate(rank_crops_by_soil_ph(args.crops, args.ph), start=1):
        print(f'{rank}. {item["crop"]:<12} {item["soil_score"] if item["soil_score"] is not None else "N/A"}/100')
        for reason in item['reasons']:
            print('   -', reason)
        for warning in item['warnings']:
            print('   !', warning)
