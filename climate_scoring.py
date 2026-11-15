"""Transparent climate suitability scoring for the Field Shift prototype.

This module does NOT contain agronomic limits. Supply sourced, crop-specific
thresholds and climate summaries computed over comparable time windows.
All scores are heuristic software scores, not validated crop yield predictions.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import isfinite


@dataclass(frozen=True)
class RangeRequirement:
    """Four ordered limits in the SAME units as the observed value.

    Outside [minimum, maximum] -> 0; inside [optimal_min, optimal_max] -> 100;
    between boundaries -> linear interpolation.  This shape is a design
    decision for our prototype, not a scientifically validated crop response.
    """
    minimum: float
    optimal_min: float
    optimal_max: float
    maximum: float

    def __post_init__(self) -> None:
        values = (self.minimum, self.optimal_min, self.optimal_max, self.maximum)
        if not all(isfinite(v) for v in values):
            raise ValueError("Requirement limits must be finite")
        if not (self.minimum < self.optimal_min <= self.optimal_max < self.maximum):
            raise ValueError("Require minimum < optimal_min <= optimal_max < maximum")


@dataclass(frozen=True)
class ClimateObservation:
    temperature_c: float | None
    precipitation_mm: float | None
    period: str  # e.g. '2020-2025 annual averages', never implied


@dataclass(frozen=True)
class CropClimateRequirements:
    crop: str
    temperature_c: RangeRequirement | None
    precipitation_mm: RangeRequirement | None
    period: str  # MUST match observation period/definition
    source: str  # provenance of limits (e.g. publication + version)


def range_score(value: float, limits: RangeRequirement) -> float:
    """Continuous piecewise-linear score between 0 and 100."""
    if not isfinite(value):
        raise ValueError("Observation must be finite")
    if value <= limits.minimum or value >= limits.maximum:
        return 0.0
    if limits.optimal_min <= value <= limits.optimal_max:
        return 100.0
    if value < limits.optimal_min:
        return 100 * (value - limits.minimum) / (limits.optimal_min - limits.minimum)
    return 100 * (limits.maximum - value) / (limits.maximum - limits.optimal_max)


def score_climate(
    observation: ClimateObservation,
    requirements: CropClimateRequirements,
    weights: dict[str, float] | None = None,
) -> dict:
    """Score only when periods and both kinds of required data are compatible."""
    weights = weights or {"temperature": 0.5, "precipitation": 0.5}
    if set(weights) != {"temperature", "precipitation"} or any(
        not isfinite(v) or v < 0 for v in weights.values()
    ) or abs(sum(weights.values()) - 1) > 1e-9:
        raise ValueError("Weights must be nonnegative and sum to 1")
    if observation.period != requirements.period:
        raise ValueError("Observation and requirement periods differ; do not mix annual/seasonal data")
    metrics = {
        "temperature": (observation.temperature_c, requirements.temperature_c, "°C"),
        "precipitation": (observation.precipitation_mm, requirements.precipitation_mm, "мм"),
    }
    partial_scores: dict[str, float] = {}
    explanations: list[str] = []
    warnings: list[str] = []
    for key, (value, limits, unit) in metrics.items():
        if weights[key] == 0:
            continue
        if value is None or limits is None:
            warnings.append(f"Немає даних або перевірених меж для показника: {key}")
            continue
        score = round(range_score(value, limits), 2)
        partial_scores[key] = score
        status = ("у межах оптимуму" if score == 100 else
                  "поза допустимими межами" if score == 0 else
                  "поза оптимумом, але в допустимих межах")
        explanations.append(f"{key}: {value:g} {unit} — {status}; оцінка {score:.1f}/100")
    required_keys = {k for k, weight in weights.items() if weight > 0}
    if set(partial_scores) != required_keys:
        warnings.append("Загальна кліматична оцінка не розрахована: бракує даних")
        total_score = None
    else:
        total_score = round(sum(weights[k] * partial_scores[k] for k in required_keys), 2)
    return {
        "crop": requirements.crop,
        "climate_score": total_score,
        "partial_scores": partial_scores,
        "reasons": explanations,
        "warnings": warnings,
        "period": observation.period,
        "requirements_source": requirements.source,
    }


if __name__ == "__main__":
    # Purely DEMONSTRATIONAL limits, not FAO ECOCROP values.
    field = ClimateObservation(temperature_c=22, precipitation_mm=420,
                               period="illustrative growing season")
    example_crop = CropClimateRequirements(
        crop="Example crop",
        temperature_c=RangeRequirement(10, 18, 26, 35),
        precipitation_mm=RangeRequirement(200, 450, 650, 900),
        period="illustrative growing season",
        source="synthetic values for testing only",
    )
    result = score_climate(field, example_crop)
    print("Crop:", result["crop"])
    print("Climate score:", result["climate_score"])
    for item in result["reasons"]:
        print("-", item)
