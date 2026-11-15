"""Місячний агро-клімат з NASA POWER для однієї точки."""

from __future__ import annotations

import numpy as np
import pandas as pd
import requests

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
PARAMETERS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT,GWETTOP,RH2M,ALLSKY_SFC_SW_DWN"


def fetch_power(
    latitude: float = 40,
    longitude: float = -96,
    start: int = 2010,
    end: int = 2026,
    timeout: int = 60,
) -> dict:
    """Сира JSON-відповідь місячного ендпоінта POWER."""
    params = {
        "parameters": PARAMETERS,
        "community": "AG",
        "latitude": latitude,
        "longitude": longitude,
        "start": start,
        "end": end,
        "format": "JSON",
    }
    response = requests.get(POWER_URL, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def parse_power(payload: dict) -> pd.DataFrame:
    """Таблиця місяців: без річного підсумку `YYYY13`, без міток `-999` і порожніх рядків."""
    frame = pd.DataFrame(payload["properties"]["parameter"])
    annual = frame.index.astype(str).str.endswith("13")
    frame = frame.loc[~annual].replace(-999, np.nan)
    frame.index = pd.to_datetime(frame.index, format="%Y%m")
    frame.index.name = "date"
    frame = frame[sorted(frame.columns)].sort_index()
    return frame.dropna()


def load_climate(
    latitude: float = 40,
    longitude: float = -96,
    start: int = 2010,
    end: int = 2026,
    timeout: int = 60,
) -> pd.DataFrame:
    """Завантажити й одразу розібрати ряд для координат поля."""
    return parse_power(
        fetch_power(
            latitude=latitude,
            longitude=longitude,
            start=start,
            end=end,
            timeout=timeout,
        )
    )


if __name__ == "__main__":
    climate = load_climate()
    print(f"{climate.index.min():%Y-%m} — {climate.index.max():%Y-%m}, рядків: {len(climate)}")
    print(list(climate.columns))
