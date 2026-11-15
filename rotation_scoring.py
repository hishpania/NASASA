"""Field Shift MVP: evaluate simplified, fixed crop return intervals.

Intervals in CSV are prototype assumptions, not universal agronomic requirements.
"""
from __future__ import annotations

import csv
from pathlib import Path


def load_rotation_rules(path: str | Path) -> dict[str, dict]:
    """Read crop,min_return_years and optional source_url from CSV.

    Example: min_return_years=3 permits a 2024 crop to return in 2027.
    """
    rules = {}
    with open(path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"crop", "min_return_years"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"Rules CSV must contain: {', '.join(sorted(required))}")
        for row in reader:
            name = (row["crop"] or "").strip()
            if not name:
                continue
            key = name.casefold()
            if key in rules:
                raise ValueError(f"Duplicate rotation rule: {name}")
            period = (row["min_return_years"] or "").strip()
            source = (row.get("source_url") or "").strip()
            if period:
                if not period.isdecimal() or int(period) < 1:
                    raise ValueError(f"Invalid min_return_years for {name}")
                years = int(period)
            else:
                years = None
            rules[key] = {"years": years, "source_url": source}
    return rules


def evaluate_rotation(crop: str, history: dict[int, str], target_year: int,
                      rule: dict | None) -> dict:
    """Return status allowed / blocked / unverified and explanations.

    'allowed' means the specified return-interval rule passed, not that
    planting is agronomically safe in every other respect.
    """
    if target_year < 1:
        raise ValueError("target_year must be positive")
    if any(year >= target_year for year in history):
        raise ValueError("History must contain years before target_year")
    if not rule or rule.get("years") is None:
        return {"status": "unverified", "rotation_score": None,
                "reasons": [], "warnings": [f"Немає перевіреного правила повернення для {crop}."]}

    years_needed = rule["years"]
    planted_years = [year for year, name in history.items()
                     if name.strip().casefold() == crop.strip().casefold()]
    if planted_years:
        latest = max(planted_years)
        elapsed = target_year - latest
        if elapsed < years_needed:
            return {"status": "blocked", "rotation_score": 0,
                    "reasons": [],
                    "warnings": [f"Останній посів {crop}: {latest}. Минуло {elapsed} р.; "
                                 f"задане правило вимагає {years_needed} р."]}
        # Rule passed against known instances, but missing older years could still matter.
        return {"status": "allowed", "rotation_score": 100,
                "reasons": [f"За відомою історією інтервал після {latest} року: "
                            f"{elapsed} р. (мінімум за правилом: {years_needed} р.)."],
                "warnings": []}

    required_years = set(range(target_year - years_needed, target_year))
    if required_years.issubset(history):
        return {"status": "allowed", "rotation_score": 100,
                "reasons": [f"У наданій історії за достатній для цього правила період "
                            f"культуру {crop} не вказано."], "warnings": []}
    return {"status": "allowed", "rotation_score": 100,
            "reasons": [f"У наданій історії культуру {crop} не вказано."],
            "warnings": [f"Історія неповна для перевірки інтервалу {years_needed} р.; "
                         "допускаємо культуру за спрощеним правилом MVP."]}


def add_rotation_to_ranking(ranking: list[dict], history: dict[int, str],
                            target_year: int, rules: dict[str, dict]) -> list[dict]:
    """Gate existing temperature+pH scores by simplified rotation rules.

    Passing the rotation check NEVER changes the existing environment score.
    Blocked/unverified crops have no final score, but keep their environment
    score in a separate field for transparency.
    """
    output = []
    for item in ranking:
        name = item["crop"]
        evidence = rules.get(name.casefold())
        rot = evaluate_rotation(name, history, target_year, evidence)
        env_score = item.get("score")
        status = rot["status"] if env_score is not None else "unverified"
        final_score = env_score if status == "allowed" else None
        output.append({
            "crop": name,
            "status": status,
            "score": final_score,
            "environment_score": env_score,
            "temperature_score": item.get("temperature_score"),
            "soil_ph_score": item.get("soil_ph_score"),
            "rotation_score": rot["rotation_score"],
            "reasons": item.get("reasons", []) + rot["reasons"],
            "warnings": item.get("warnings", []) + rot["warnings"],
            "rule_source": evidence.get("source_url") if evidence else None,
        })
    return sorted(output, key=lambda r: (
        r["score"] is None,
        -(r["score"] if r["score"] is not None else 0),
        r["crop"],
    ))
