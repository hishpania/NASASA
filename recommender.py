"""Field Shift: transparent prototype crop recommendation engine.

Climate and soil scores are inputs (0..100), not calculated from NASA data here.
Rotation restrictions must be supplied from validated agronomic references.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

WEIGHTS = {"climate": 0.35, "soil": 0.25, "rotation": 0.40}


@dataclass(frozen=True)
class Crop:
    name: str
    climate_score: float
    soil_score: float
    min_return_years: int | None = None
    # min_return_years is a DEMONSTRATION parameter, NOT a sourced crop requirement.


def validate_score(value: float, label: str) -> None:
    if not 0 <= value <= 100:
        raise ValueError(f"{label} must be between 0 and 100")


def recommend(
    crops: list[Crop], history: dict[int, str], target_year: int,
    weights: dict[str, float] = WEIGHTS,
) -> list[dict[str, Any]]:
    """Rank candidates. Missing rotation rules remain 'unknown', never assumed safe.

    Return years interpretation: same crop grown in year Y with min_return_years=N
    cannot be planted again until target_year - Y >= N.
    """
    if set(weights) != {"climate", "soil", "rotation"} or any(v < 0 for v in weights.values()) or abs(sum(weights.values()) - 1) > 1e-9:
        raise ValueError("Weights must be nonnegative climate/soil/rotation values summing to 1")
    if any(y >= target_year for y in history):
        raise ValueError("History years must precede target_year")

    results = []
    for crop in crops:
        validate_score(crop.climate_score, "climate_score")
        validate_score(crop.soil_score, "soil_score")
        years_planted = [year for year, planted in history.items() if planted.casefold() == crop.name.casefold()]
        most_recent = max(years_planted) if years_planted else None
        reasons = [f"Клімат: {crop.climate_score:.0f}/100 (зовнішня оцінка)",
                   f"Ґрунт: {crop.soil_score:.0f}/100 (зовнішня оцінка)"]
        warnings: list[str] = []
        eligible = True

        # For the prototype, a known rotation rule is treated as pass/fail.
        # For a crop never seen in the available history we still lack proof of
        # what happened before those years; therefore rotation is unverified.
        rotation_score = None
        if crop.min_return_years is None:
            warnings.append("Правило повернення культури не задане; сівозміну не перевірено")
        elif crop.min_return_years < 1:
            raise ValueError("min_return_years must be >= 1 or None")
        elif most_recent is None:
            warnings.append("Культури немає в наданій історії; повна історія невідома")
            rotation_score = 100.0  # provisional score only, not evidence of safety
        else:
            elapsed = target_year - most_recent
            if elapsed < crop.min_return_years:
                eligible = False
                rotation_score = 0.0
                warnings.append(
                    f"Від останнього посіву ({most_recent}) минуло {elapsed} р.; "
                    f"задане правило вимагає {crop.min_return_years} р."
                )
            else:
                rotation_score = 100.0
                reasons.append(f"Інтервал після {most_recent} року відповідає заданому правилу")

        if rotation_score is None:
            # We do not make up a rotation score or include the crop in ranking.
            score = None
        else:
            score = round(
                weights["climate"] * crop.climate_score
                + weights["soil"] * crop.soil_score
                + weights["rotation"] * rotation_score,
                2,
            ) if eligible else None

        results.append({
            "crop": crop.name,
            "eligible": eligible,
            "score": score,
            "climate_score": crop.climate_score,
            "soil_score": crop.soil_score,
            "rotation_score": rotation_score,
            "reasons": reasons,
            "warnings": warnings,
        })

    # eligible with computed score first, then unverified, then prohibited
    return sorted(results, key=lambda r: (
        0 if r["eligible"] and r["score"] is not None else (1 if r["eligible"] else 2),
        -(r["score"] if r["score"] is not None else -1),
        r["crop"],
    ))


if __name__ == "__main__":
    # MOCK SCORES AND MOCK ROTATION INTERVALS — FOR SOFTWARE TESTING ONLY.
    history = {2023: "Soybean", 2024: "Corn", 2025: "Wheat", 2026: "Sunflower"}
    crops = [
        Crop("Wheat", 88, 75, min_return_years=2),
        Crop("Corn", 70, 80, min_return_years=2),
        Crop("Soybean", 82, 90, min_return_years=2),
        Crop("Sunflower", 75, 72, min_return_years=3),
        Crop("Pea", 80, 85, min_return_years=None),
    ]

    for position, item in enumerate(recommend(crops, history, target_year=2027), 1):
        label = (f"{item['score']}/100" if item['score'] is not None
                 else "без оцінки / виключено")
        print(f"\n{position}. {item['crop']}: {label}")
        for msg in item["reasons"]:
            print(f"  + {msg}")
        for msg in item["warnings"]:
            print(f"  ! {msg}")
