"""Read and validate crop temperature thresholds exported from FAO EcoCrop.

Input: crop_database.csv created by prepare_crop_database.py.
The underlying EcoCrop values are expert estimates: not validated yield models.
Precipitation is deliberately NOT scored: EcoCrop values are annual and need
explicit crop-cycle alignment before comparison with NASA POWER observations.
"""
from __future__ import annotations

from pathlib import Path
import pandas as pd
from climate_scoring import RangeRequirement, CropClimateRequirements

REQUIRED = ('scientificname', 'crop', 'tmin', 'topmn', 'topmx', 'tmax')


def read_ecocrop(path: str | Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = set(REQUIRED) - set(df.columns)
    if missing:
        raise ValueError(f'Missing EcoCrop columns: {sorted(missing)}')
    if df['crop'].isna().any() or df['crop'].duplicated().any():
        raise ValueError('Crop names must be present and unique')
    for column in ('tmin', 'topmn', 'topmx', 'tmax'):
        df[column] = pd.to_numeric(df[column], errors='coerce')
    return df


def temperature_requirements(row: pd.Series, period: str) -> CropClimateRequirements:
    """Convert one checked crop row to score_climate-compatible requirements.

    Missing/invalid thresholds fail visibly; we never invent values.
    Precipitation weight must be zero when scoring these requirements.
    """
    columns = ('tmin', 'topmn', 'topmx', 'tmax')
    if row[list(columns)].isna().any():
        raise ValueError(f"{row['crop']}: missing temperature threshold")
    limits = RangeRequirement(*[float(row[col]) for col in columns])
    return CropClimateRequirements(
        crop=str(row['crop']), temperature_c=limits, precipitation_mm=None,
        period=period,
        source=f"FAO EcoCrop expert estimates, {row['scientificname']}",
    )


def score_crops_temperature(df: pd.DataFrame, temperature_c: float, period: str) -> list[dict]:
    """Rank only by temperature; annual rainfall not yet included."""
    from climate_scoring import ClimateObservation, score_climate
    observation = ClimateObservation(temperature_c, None, period)
    results = []
    for _, row in df.iterrows():
        try:
            requirement = temperature_requirements(row, period)
            result = score_climate(observation, requirement,
                                   weights={'temperature': 1.0, 'precipitation': 0.0})
            result['status'] = 'scored'
        except (ValueError, TypeError) as exc:
            result = {'crop': str(row['crop']), 'climate_score': None,
                      'status': 'needs_review', 'reasons': [], 'warnings': [str(exc)]}
        results.append(result)
    return sorted(results, key=lambda x: (x['climate_score'] is None,
                                         -(x['climate_score'] or 0), x['crop']))


if __name__ == '__main__':
    path = Path(__file__).with_name('crop_database.csv')
    if not path.exists():
        raise SystemExit('No crop_database.csv found. Run prepare_crop_database.py first.')
    crops = read_ecocrop(path)
    print('EcoCrop crops:', ', '.join(crops['crop'].astype(str)))
    print('Example temperature-only ranking for a MOCK temperature of 22 °C:')
    for result in score_crops_temperature(crops, 22, 'illustrative period'):
        print(result['crop'], result['climate_score'], result['warnings'])
