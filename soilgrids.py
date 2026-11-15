"""SoilGrids soil pH from locally cached aggregated ISRIC GeoTIFF.

First run downloads an official ~4.3 MB, 5-km aggregated raster from ISRIC
WebDAV; subsequent runs use the local copy. The returned value is a model
estimate at 0-5 cm depth, NOT a field measurement. Manual --ph in
run_combined_ranking.py remains available as a fallback.

Dependencies: requests, rasterio, pyproj (installed via rasterio on many systems).
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import requests
import rasterio
from rasterio.warp import transform as transform_coordinates

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / 'data' / 'soilgrids'
FILENAME = 'phh2o_0-5cm_mean_5000.tif'
DATA_URL = (
    'https://files.isric.org/soilgrids/latest/data_aggregated/'
    f'5000m/phh2o/{FILENAME}'
)


def download_raster(destination: Path) -> None:
    """Download one GeoTIFF once, and atomically move it into the cache."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix('.tif.part')
    try:
        print(f'Downloading SoilGrids 5-km pH dataset (~4.3 MB): {DATA_URL}')
        with requests.get(DATA_URL, stream=True, timeout=(15, 90)) as response:
            response.raise_for_status()
            with temp.open('wb') as file:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        file.write(chunk)
        with rasterio.open(temp) as check:
            if check.count < 1 or check.crs is None:
                raise ValueError('Downloaded GeoTIFF has no band or CRS')
        temp.replace(destination)
    except (requests.RequestException, OSError, ValueError, rasterio.errors.RasterioError) as exc:
        temp.unlink(missing_ok=True)
        raise RuntimeError(
            'Could not download/read ISRIC WebDAV GeoTIFF. '
            'You can supply pH manually with --ph. '
            f'Details: {exc}'
        ) from exc


def get_soil_ph(latitude: float, longitude: float) -> dict:
    """Get modelled 0-5 cm soil pH by sampling a cached 5-km raster."""
    if not (math.isfinite(latitude) and math.isfinite(longitude)
            and -90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError('Invalid latitude/longitude')

    path = CACHE_DIR / FILENAME
    if not path.exists():
        download_raster(path)

    try:
        with rasterio.open(path) as raster:
            if raster.crs is None:
                raise ValueError('SoilGrids GeoTIFF lacks CRS')
            xs, ys = transform_coordinates('EPSG:4326', raster.crs,
                                            [longitude], [latitude])
            x, y = xs[0], ys[0]
            if not (raster.bounds.left <= x < raster.bounds.right
                    and raster.bounds.bottom < y <= raster.bounds.top):
                raise ValueError('Location outside raster coverage')
            pixel = next(raster.sample([(x, y)], masked=True))[0]
            if bool(getattr(pixel, 'mask', False)):
                raise ValueError('NoData at these coordinates (e.g. water area)')
            raw_value = float(pixel)
    except (OSError, ValueError, rasterio.errors.RasterioError) as exc:
        raise RuntimeError(
            'Could not extract soil pH from local raster. '
            'You can still use --ph in run_combined_ranking.py. '
            f'Details: {exc}'
        ) from exc

    ph = raw_value / 10.0  # ISRIC phh2o encoded as pH * 10
    if not math.isfinite(ph) or not 0 < ph <= 14:
        raise RuntimeError(f'Unexpected SoilGrids pH: {raw_value=}')

    return {
        'latitude': latitude,
        'longitude': longitude,
        'soil_ph': round(ph, 2),
        'source': 'ISRIC SoilGrids WebDAV cached 5-km GeoTIFF',
        'layer': 'phh2o_0-5cm_mean',
        'depth_cm': '0-5',
        'resolution_m': 5000,
        'note': 'Coarse regional model estimate; not a measured field soil pH.',
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Local SoilGrids pH from ISRIC WebDAV')
    parser.add_argument('--lat', required=True, type=float)
    parser.add_argument('--lon', required=True, type=float)
    args = parser.parse_args()
    result = get_soil_ph(args.lat, args.lon)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    output = ROOT / 'soilgrids_result.json'
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Saved: {output}')


if __name__ == '__main__':
    main()
