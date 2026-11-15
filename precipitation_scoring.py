"""Simple and transparent historical precipitation suitability proxy.

Uses calendar-year precipitation totals and ECOCROP ROPMN/ROPMX ranges.
These ECOCROP ranges are described differently across secondary sources
(annual vs. growing-cycle), so this is an explicitly approximate proxy,
not crop water demand or a model of irrigation/seasonal water balance.
"""
from __future__ import annotations

import math

import pandas as pd


def rainfall_score(mm: float, optimal_min: float, optimal_max: float) -> float:
    """100 within optimum; outside: percent ratio to nearest bound, capped at 100.

    Example: annual rain 500 mm, optimum starts at 1000 mm -> 50/100.
    Formula is an MVP heuristic, not a calibrated crop response function.
    """
    if not all(math.isfinite(v) for v in (mm, optimal_min, optimal_max)):
        raise ValueError("Missing or non-finite precipitation requirement")
    if mm < 0 or optimal_min <= 0 or optimal_max < optimal_min:
        raise ValueError("Invalid precipitation requirement")
    if optimal_min <= mm <= optimal_max:
        return 100.0
    if mm < optimal_min:
        return round(100.0 * mm / optimal_min, 2)
    return round(100.0 * optimal_max / mm, 2)


def evaluate_precipitation(row: pd.Series, daily: pd.DataFrame,
                           start_year: int, end_year: int) -> dict:
    """Return per-year evidence and mean score; refuse incomplete years."""
    crop = str(row["crop"])
    low = pd.to_numeric(row.get("ropmn"), errors="coerce")
    high = pd.to_numeric(row.get("ropmx"), errors="coerce")
    if pd.isna(low) or pd.isna(high) or not (0 < float(low) <= float(high)):
        return {"crop": crop, "score": None,
                "warning": "Немає коректних оптимальних меж опадів ECOCROP (ropmn/ropmx).",
                "historical_years": []}
    low, high = float(low), float(high)
    results = []
    for year in range(start_year, end_year + 1):
        index = pd.date_range(f"{year}-01-01", f"{year}-12-31", freq="D")
        if "precipitation_mm_day" not in daily:
            return {"crop": crop, "score": None, "warning": "NASA POWER: немає колонки опадів.", "historical_years": []}
        values = daily.reindex(index)["precipitation_mm_day"]
        if values.isna().any() or (values.dropna() < 0).any():
            return {"crop": crop, "score": None,
                    "warning": f"Неповні або некоректні дані опадів за {year} рік.",
                    "historical_years": results}
        total = float(values.sum())
        results.append({"year": year, "annual_precipitation_mm": round(total, 1),
                        "rainfall_score": rainfall_score(total, low, high)})
    score = round(sum(item["rainfall_score"] for item in results) / len(results), 2)
    totals = [item["annual_precipitation_mm"] for item in results]
    return {
        "crop": crop, "score": score,
        "optimal_range_mm": [low, high],
        "historical_years": results,
        "summary": f"Річні опади {min(totals):.0f}–{max(totals):.0f} мм; ECOCROP {low:g}–{high:g} мм; оцінка {score:.1f}/100.",
        "warning": "Наближене порівняння річних опадів із ECOCROP; розподіл у сезоні та полив не враховані.",
    }
