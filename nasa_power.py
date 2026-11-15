"""Download and summarize daily NASA POWER climate data for Field Shift.

Daily POWER grid data describe the vicinity of a coordinate, not a field sensor.
No agronomic suitability limits are assumed in this module.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
import hashlib
import json
import os
import tempfile
import socket
import urllib3.util.connection as urllib3_connection
import pandas as pd
import requests

BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point'
PARAMETERS = ('T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN')
# Favor IPv4 on Windows networks where IPv6 connection attempts can hang.
# This affects requests/urllib3 used by NASA POWER, not the underlying data.
urllib3_connection.allowed_gai_family = lambda: socket.AF_INET

COLUMNS = {
    'T2M': 'temperature_c',
    'T2M_MAX': 'max_temperature_c',
    'T2M_MIN': 'min_temperature_c',
    'PRECTOTCORR': 'precipitation_mm_day',
    'ALLSKY_SFC_SW_DWN': 'solar_radiation_mj_m2_day',
}


def parse_power_response(payload: dict) -> pd.DataFrame:
    """Convert NASA JSON parameter/date mapping to indexed daily DataFrame.

    Fails explicitly on missing series; -999 and other known fill values become NA.
    """
    try:
        measurements = payload['properties']['parameter']
    except (KeyError, TypeError) as exc:
        raise ValueError('Invalid NASA POWER response: missing properties.parameter') from exc
    missing = set(PARAMETERS) - set(measurements)
    if missing:
        raise ValueError(f'Missing NASA POWER parameters: {sorted(missing)}')
    df = pd.DataFrame({key: measurements[key] for key in PARAMETERS})
    if df.empty:
        raise ValueError('No observations returned')
    df.index = pd.to_datetime(df.index, format='%Y%m%d', errors='raise')
    df.index.name = 'date'
    df = df.sort_index()
    if df.index.has_duplicates:
        raise ValueError('Duplicate dates in NASA POWER response')
    for col in PARAMETERS:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    # Official response provides fill_value in parameter_information metadata.
    metadata = payload.get('parameters', {})
    for col in PARAMETERS:
        fill_value = metadata.get(col, {}).get('fill_value', -999)
        df[col] = df[col].replace([-999, -999.0, fill_value], float('nan'))
    return df.rename(columns=COLUMNS)


def _cache_location(latitude: float, longitude: float, start: str, end: str,
                    cache_dir: Path) -> Path:
    key = json.dumps({"lat": latitude, "lon": longitude, "start": start, "end": end,
                      "parameters": PARAMETERS, "community": "AG", "time_standard": "LST",
                      "format_version": 1}, sort_keys=True)
    return cache_dir / (hashlib.sha256(key.encode("utf-8")).hexdigest()[:24] + ".json")


def fetch_daily(latitude: float, longitude: float, start: str, end: str,
                session: requests.Session | None = None, *, refresh: bool = False,
                cache_dir: Path | None = None) -> pd.DataFrame:
    """Get daily data for an inclusive YYYYMMDD period; no API key needed."""
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError('Invalid latitude/longitude')
    try:
        start_date = date.fromisoformat(f'{start[:4]}-{start[4:6]}-{start[6:]}')
        end_date = date.fromisoformat(f'{end[:4]}-{end[4:6]}-{end[6:]}')
    except ValueError as exc:
        raise ValueError('start/end must be YYYYMMDD calendar dates') from exc
    if len(start) != 8 or len(end) != 8 or start_date > end_date:
        raise ValueError('start/end must be YYYYMMDD and start <= end')
    if end_date > date.today():
        raise ValueError('NASA POWER daily historical API cannot request future dates')

    # Cache raw API JSON, then reuse the same parser and missing-value validation.
    # Custom mock sessions use the normal cache path unless caller passes a temp dir.
    cache_dir = Path(cache_dir) if cache_dir is not None else Path(__file__).resolve().parent / "data" / "nasa_power_cache"
    cache_path = _cache_location(latitude, longitude, start, end, cache_dir)
    if cache_path.is_file() and not refresh:
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            result = parse_power_response(cached)
            print(f"NASA POWER: cache hit ({cache_path.name})", flush=True)
            return result
        except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
            print(f"NASA POWER: cached data invalid ({exc}); downloading again", flush=True)

    params = {
        'parameters': ','.join(PARAMETERS),
        'community': 'AG',
        'longitude': longitude,
        'latitude': latitude,
        'start': start,
        'end': end,
        'format': 'JSON',
        'time-standard': 'LST',
    }
    get = session.get if session is not None else requests.get
    try:
        response = get(BASE_URL, params=params, timeout=(10, 60))
        response.raise_for_status()
        payload = response.json()
        data = parse_power_response(payload)
    except (requests.RequestException, ValueError) as exc:
        raise RuntimeError(f"NASA POWER request failed: {exc}") from exc
    # Cache only after successful parsing, via atomic replacement to avoid partial writes.
    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=cache_dir,
                                         prefix=".nasa_", suffix=".tmp", delete=False) as tmp:
            temporary = Path(tmp.name)
            json.dump(payload, tmp, ensure_ascii=False)
        os.replace(temporary, cache_path)
        print(f"NASA POWER: saved cache ({cache_path.name})", flush=True)
    except OSError as exc:
        print(f"NASA POWER: cannot save cache ({exc}); continuing without cache", flush=True)
    finally:
        if 'temporary' in locals():
            temporary.unlink(missing_ok=True)
    # Some requested dates near real-time may be unavailable; do not fabricate.
    return data


def summarize_period(data: pd.DataFrame, start: str, end: str) -> dict:
    """Summarize exact date range, refusing to silently sum partial precipitation."""
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)
    if start_ts > end_ts:
        raise ValueError('start must precede end')
    section = data.loc[(data.index >= start_ts) & (data.index <= end_ts)]
    expected = pd.date_range(start_ts, end_ts, freq='D')
    if section.empty:
        raise ValueError('No data for requested dates')
    missing_dates = len(expected.difference(section.index))
    missing_temp = int(section['temperature_c'].isna().sum())
    missing_precip = int(section['precipitation_mm_day'].isna().sum())
    complete_temp = missing_dates == 0 and missing_temp == 0
    complete_precip = missing_dates == 0 and missing_precip == 0
    return {
        'period': f'{start_ts.date()} to {end_ts.date()}',
        'days_expected': len(expected),
        'days_present': len(section),
        'missing_dates': missing_dates,
        'avg_temperature_c': round(float(section['temperature_c'].mean()), 2) if complete_temp else None,
        'precipitation_mm': round(float(section['precipitation_mm_day'].sum()), 2) if complete_precip else None,
        'avg_solar_radiation_mj_m2_day': (
            round(float(section['solar_radiation_mj_m2_day'].mean()), 2)
            if missing_dates == 0 and section['solar_radiation_mj_m2_day'].notna().all() else None
        ),
        'warnings': ([f'{missing_dates} dates absent'] if missing_dates else []) +
                    ([f'{missing_temp} days missing temperature'] if missing_temp else []) +
                    ([f'{missing_precip} days missing precipitation'] if missing_precip else []),
    }


def as_climate_observation(summary: dict):
    """Pass the period definition unchanged to the existing scoring module."""
    from climate_scoring import ClimateObservation
    return ClimateObservation(
        temperature_c=summary['avg_temperature_c'],
        precipitation_mm=summary['precipitation_mm'],
        period=summary['period'],
    )


if __name__ == '__main__':
    # Example location: Kyiv, historical completed years (not a seasonal forecast).
    df = fetch_daily(50.45, 30.52, '20240101', '20251231')
    print('First observations:')
    print(df.head().to_string())
    summary = summarize_period(df, '20250401', '20250930')
    print('\n2025 Apr-Sep climate summary:')
    print(summary)
    path = Path(__file__).parent / 'nasa_power_kyiv_2024_2025.csv'
    df.to_csv(path)
    print(f'\nSaved: {path}')
