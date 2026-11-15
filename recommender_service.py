"""Stable Python entry point for the Field Shift recommendation engine.

Put this file alongside the CURRENT working main.py and all its dependencies.
No FastAPI dependency, subprocess, stdout parsing, or shared output JSON file.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Mapping
import json
import math

import main as engine


def _python_json(value: Any) -> Any:
    """Ensure the result contains only ordinary JSON-compatible Python values."""
    # Round-trip handles pandas/numpy values when they are already standard
    # numeric types; reject unsupported/non-finite data rather than output NaN.
    return json.loads(json.dumps(value, ensure_ascii=False, allow_nan=False))


def recommend(
    latitude: float,
    longitude: float,
    planning_year: int,
    crop_history: Mapping[int | str, str],
    soil_ph: float | None = None,
    *,
    climate_years: int = 10,
    start_year: int | None = None,
    end_year: int | None = None,
    refresh_climate: bool = False,
    start_month: int = 5,
    end_month: int = 9,
    project_dir: str | Path | None = None,
) -> dict[str, Any]:
    """Return ranked crops, exclusion reasons and rotation advice as a dict.

    The year chooses rotation timing; climate uses historical completed years.
    Returns no files and does not start an HTTP server.
    May raise ValueError, OSError, RuntimeError on invalid input or data failure.
    """
    for label, v, minimum, maximum in (
        ("latitude", latitude, -90, 90),
        ("longitude", longitude, -180, 180),
    ):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not minimum <= v <= maximum:
            raise ValueError(f"{label} must be a finite number from {minimum} to {maximum}")
    if isinstance(planning_year, bool) or not isinstance(planning_year, int) or planning_year < 1982:
        raise ValueError("planning_year must be an integer year >= 1982")
    if soil_ph is not None and (isinstance(soil_ph, bool) or not isinstance(soil_ph, (int, float)) or not math.isfinite(soil_ph) or not 0 <= soil_ph <= 14):
        raise ValueError("soil_ph must be 0..14 or None")
    if isinstance(climate_years, bool) or not isinstance(climate_years, int) or not 1 <= climate_years <= 30:
        raise ValueError("climate_years must be 1..30")
    if not (1 <= start_month <= end_month <= 12):
        raise ValueError("start_month/end_month must be between 1 and 12, in ascending order")
    if not isinstance(crop_history, Mapping):
        raise ValueError("crop_history must be a mapping of years to crop names")

    history: dict[int, str] = {}
    for raw_year, raw_crop in crop_history.items():
        try:
            year = int(raw_year)
        except (ValueError, TypeError, OverflowError) as exc:
            raise ValueError(f"Invalid crop_history year: {raw_year!r}") from exc
        if year >= planning_year or year < 1 or year in history:
            raise ValueError(f"Crop history year must be unique and before planning year: {year}")
        if not isinstance(raw_crop, str) or not raw_crop.strip():
            raise ValueError(f"Missing crop name for history year {year}")
        history[year] = raw_crop.strip()

    latest_full_year = min(date.today().year - 1, planning_year - 1)
    if end_year is None:
        end_year = latest_full_year
    if start_year is None:
        start_year = end_year - climate_years + 1
    if (isinstance(start_year, bool) or isinstance(end_year, bool) or
            not isinstance(start_year, int) or not isinstance(end_year, int) or
            start_year < 1981 or start_year > end_year or
            end_year > latest_full_year):
        raise ValueError("Invalid historical period; use completed years from 1981 up to the year before planting")

    root = Path(project_dir) if project_dir is not None else Path(engine.__file__).resolve().parent
    paths = {
        "crops": root / "crop_database.csv",
        "families": root / "crop_families.csv",
        "rules": root / "rotation_rules.csv",
        "cold_profiles": root / "cold_risk_profiles.csv",
        "growing_profiles": root / "growing_season_profiles.csv",
        "gdd_profiles": root / "gdd_profiles.csv",
    }
    missing = [str(p) for p in paths.values() if not p.is_file()]
    if missing:
        raise FileNotFoundError("Missing project data files: " + ", ".join(missing))

    crops = engine.read_ecocrop(paths["crops"])
    families = engine.load_families(paths["families"])
    rules = engine.load_rotation_rules(paths["rules"])
    cold_profiles = engine.load_cold_risks(paths["cold_profiles"])
    growing_profiles = engine.load_profiles(paths["growing_profiles"])
    gdd_profiles = engine.load_gdd_profiles(paths["gdd_profiles"])

    if soil_ph is None:
        from soilgrids import get_soil_ph
        soil = get_soil_ph(latitude, longitude)
        ph = float(soil["soil_ph"])
        source = soil["source"]
    else:
        ph = float(soil_ph)
        source = "manual override"

    daily = engine.fetch_daily(
        latitude, longitude, f"{start_year}0101", f"{end_year}1231",
        refresh=refresh_climate,
    )
    seasons = engine.calculate_season_means(daily, start_year, end_year, start_month, end_month)
    label = f"months {start_month}-{end_month}, {start_year}-{end_year}"
    temp = engine.build_ranking(crops, seasons, label)
    soil_scores = engine.rank_crops_by_soil_ph(paths["crops"], ph)
    combined = engine.combine_rankings(temp, soil_scores, 0.5)
    groups = engine.evaluate_all(
        crops, combined, seasons, history, planning_year, families, rules,
        daily, start_year, end_year, cold_profiles, growing_profiles, gdd_profiles,
    )

    def present_crop(row: dict) -> dict:
        """Stable frontend fields, with detailed evidence retained for future UI."""
        return {
            "crop": row["crop"],
            "status": row["status"],
            "score": row["score"],
            "scores": {
                "temperature": row["temperature_score"],
                "precipitation": row["precipitation_score"],
                "soil_ph": row["soil_ph_score"],
            },
            "rotation": {
                "recommended_return_years": row["recommended_return_years"],
                "years_since_last_crop": row["years_since_same_crop"],
                "same_family_previous_year": row["same_family_previous_year"],
                "advice": row["rotation_advice"],
            },
            "reasons": row["reasons"],
            "warnings": row["warnings"],
            "exclusion_reasons": row["exclusion_reasons"],
            "review_reasons": row["review_reasons"],
            "details": {
                "temperature": row["temperature_evaluation"],
                "precipitation": row["precipitation"],
                "growing_season": row["growing_season"],
                "winter_cold_risk": row["winter_cold_risk"],
                "gdd": row["heat_accumulation_gdd"],
            },
        }

    output = {
        "location": {"latitude": float(latitude), "longitude": float(longitude)},
        "planning_year": planning_year,
        "crop_history": {str(y): name for y, name in sorted(history.items())},
        "climate_reference_period": {
            "start_year": start_year, "end_year": end_year,
            "years": end_year - start_year + 1,
            "type": "historical_observations_not_forecast",
        },
        "soil": {"ph": ph, "source": source},
        "scoring_weights": {"temperature": 0.40, "precipitation": 0.35, "soil_ph": 0.25},
        "total_crops": len(crops),
        "counts": {key: len(rows) for key, rows in groups.items()},
        "recommended": [present_crop(r) for r in groups["recommended"]],
        "excluded": [present_crop(r) for r in groups["excluded"]],
        "needs_review": [present_crop(r) for r in groups["needs_review"]],
        "disclaimer": "Historical heuristic suitability index, not a crop yield forecast or planting guarantee.",
    }
    return _python_json(output)
