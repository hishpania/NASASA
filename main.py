"""Field Shift MVP: coordinates -> NASA + soil -> hard filters -> crop ranking.

Uses all crops in crop_database.csv (not just a hardcoded six). For added crops,
add a botanical family in crop_families.csv and a prototype return interval in
rotation_rules.csv. Rotation metadata is advisory; missing values never prevent ranking.

Important: crop-family prohibition and regional climate threshold below are
explicit MVP screening assumptions, not universal agronomic standards.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
from datetime import date
from pathlib import Path

import pandas as pd

from growing_season import evaluate_growing_season, load_profiles
from heat_units import load_gdd_profiles, evaluate_gdd
from precipitation_scoring import evaluate_precipitation
from temperature_scoring import score_frost_free_temperature
from ecocrop import read_ecocrop
from nasa_power import fetch_daily
from rotation_scoring import evaluate_rotation, load_rotation_rules
from run_climate_ranking import build_ranking, calculate_season_means
from run_combined_ranking import combine_rankings
from run_rotation_ranking import parse_history
from soil_scoring import rank_crops_by_soil_ph

ROOT = Path(__file__).resolve().parent


def load_families(path: Path) -> dict[str, str]:
    families: dict[str, str] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not {"crop", "family"}.issubset(reader.fieldnames or []):
            raise ValueError("Families CSV needs crop,family columns")
        for row in reader:
            crop = (row["crop"] or "").strip().casefold()
            family = (row["family"] or "").strip()
            if not crop or not family or crop in families:
                raise ValueError(f"Missing/duplicate family for crop: {row!r}")
            families[crop] = family.casefold()
    return families


def region_climate_filter(row: pd.Series, seasons: list[dict]) -> tuple[str, str]:
    """Conservative seasonal-mean screen using EcoCrop absolute temp limits.

    A season mean outside a crop's stated limits in EVERY observed season
    marks it excluded. This is a heuristic; crop-specific planting windows
    and coldest/warmest day requirements are not checked yet.
    """
    values = [pd.to_numeric(row.get(k), errors="coerce") for k in ("tmin", "tmax")]
    if any(pd.isna(v) or not math.isfinite(float(v)) for v in values):
        return "needs_review", "Немає коректних абсолютних температурних меж ECOCROP."
    low, high = map(float, values)
    if low > high:
        return "needs_review", "Межі температур ECOCROP суперечливі."
    means = [s["temperature_c"] for s in seasons]
    if all(mean < low or mean > high for mean in means):
        return "excluded", (f"Усі історичні середні температури обраного сезону "
                             f"поза допустимим діапазоном ECOCROP {low:g}–{high:g} °C.")
    return "allowed", (f"Щонайменше один історичний сезон має середню температуру "
                       f"в межах {low:g}–{high:g} °C (попередня перевірка регіону).")


def family_filter(crop: str, history: dict[int, str], target_year: int,
                  families: dict[str, str]) -> tuple[str, str]:
    """Explicit MVP rule: no same botanical family as immediately prior year."""
    fam = families.get(crop.casefold())
    if not fam:
        return "needs_review", "Немає ботанічного сімейства в crop_families.csv."
    predecessor = history.get(target_year - 1)
    if predecessor is None:
        return "needs_review", "Невідома культура попереднього року; сумісність сімейств не перевірена."
    pred_fam = families.get(predecessor.casefold())
    if not pred_fam:
        return "needs_review", f"Невідоме сімейство попередньої культури {predecessor}."
    if fam == pred_fam:
        return "excluded", (f"MVP-правило: {crop} і {predecessor} належать до сімейства "
                            f"{fam}; не висаджуємо після нього наступного року.")
    return "allowed", f"Сімейство {fam} відрізняється від попередника {predecessor} ({pred_fam})."


def load_cold_risks(path: Path) -> dict[str, dict]:
    """Explicit crop-specific MVP cold screening profiles; NOT EcoCrop temperatures."""
    profiles = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            name = (row.get("crop") or "").strip().casefold()
            if not name:
                continue
            if name in profiles:
                raise ValueError(f"Duplicate cold risk profile: {name}")
            profiles[name] = {
                "threshold_c": float(row["severe_cold_threshold_c"]),
                "description": row.get("description", "").strip(),
            }
    return profiles


def cold_survival_filter(crop: str, daily: pd.DataFrame, start_year: int,
                         end_year: int, profiles: dict[str, dict]) -> tuple[str, str, dict]:
    """Screen unprotected outdoor survival; only explicitly listed sensitive crops.

    Uses daily grid-air T2M_MIN, NOT leaf temperatures nor crop phenology.
    Exclude only when severe threshold breached in >=2 different winters/years.
    """
    profile = profiles.get(crop.casefold())
    if profile is None:
        return "not_applicable", "Немає окремого профілю зимового ризику; використано сезонний кліматичний фільтр.", {}
    threshold = profile["threshold_c"]
    yearly = {}
    for year in range(start_year, end_year + 1):
        expected = pd.date_range(f"{year}-01-01", f"{year}-12-31", freq="D")
        part = daily.reindex(expected)["min_temperature_c"]
        if part.isna().any():
            return "needs_review", f"Неповні дані T2M_MIN за {year}; зимовий ризик не перевірено.", {}
        yearly[str(year)] = round(float(part.min()), 2)
    breach_years = [year for year, minimum in yearly.items() if minimum < threshold]
    details = {"severe_cold_threshold_c": threshold,
               "historical_annual_minima_c": yearly,
               "years_below_threshold": len(breach_years),
               "outdoor_unprotected_assumption": True}
    if len(breach_years) >= 2:
        return "excluded", (
            f"Критичний зимовий ризик для {crop}: у {len(breach_years)} із {len(yearly)} років "
            f"мінімальна температура була нижчою за MVP-поріг {threshold:g} °C "
            f"(мінімум {min(yearly.values()):g} °C). "
            "Для вирощування без зимового захисту культура кліматично непридатна."
        ), details
    if breach_years:
        return "needs_review", (
            f"За {len(breach_years)} рік(роки) температура опускалася нижче "
            f"MVP-порога {threshold:g} °C; потрібна оцінка ризику холоду."
        ), details
    return "allowed", (
        f"У {len(yearly)} повних роках мінімальна температура не опускалася "
        f"нижче MVP-порога {threshold:g} °C; інші ризики не перевірено."
    ), details


def evaluate_all(crops: pd.DataFrame, combined: list[dict], seasons: list[dict],
                 history: dict[int, str], target_year: int,
                 families: dict[str, str], rules: dict[str, dict],
                 daily: pd.DataFrame, start_year: int, end_year: int,
                 cold_profiles: dict[str, dict], growing_profiles: dict[str, float],
                 gdd_profiles: dict[str, dict]) -> dict:
    scores = {item["crop"].casefold(): item for item in combined}
    recommended, excluded, needs_review = [], [], []
    for _, crop_row in crops.iterrows():
        name = str(crop_row["crop"])
        record = scores.get(name.casefold(), {})
        reasons = list(record.get("reasons", []))
        warnings = list(record.get("warnings", []))
        hard_fails = []
        unknowns = []

        climate_status, climate_note = region_climate_filter(crop_row, seasons)
        reasons.append(climate_note)
        if climate_status == "excluded":
            hard_fails.append(climate_note)
        elif climate_status == "needs_review":
            unknowns.append(climate_note)

        cold_status, cold_note, cold_details = cold_survival_filter(
            name, daily, start_year, end_year, cold_profiles
        )
        if cold_status != "not_applicable":
            reasons.append(cold_note)
        if cold_status == "excluded":
            hard_fails.append(cold_note)
        elif cold_status == "needs_review":
            unknowns.append(cold_note)

        season_status, season_note, season_details = evaluate_growing_season(
            name, crop_row, daily, start_year, end_year, growing_profiles
        )
        if season_status != "not_applicable":
            reasons.append(season_note)
        if season_status == "excluded":
            hard_fails.append(season_note)
        elif season_status == "needs_review":
            unknowns.append(season_note)

        heat_status, heat_note, heat_details = evaluate_gdd(
            name, daily, start_year, end_year, gdd_profiles, season_details
        )
        if heat_status != "not_applicable":
            reasons.append(heat_note)
            # GDD without a crop-specific validated maturity target is information,
            # not evidence for auto-exclusion or a numerical score adjustment.
            if heat_status == "needs_review":
                warnings.append(heat_note)

        # Crop-specific temperature: use this crop's observed frost-free window
        # for warm-season crops; keep the legacy fixed May-Sep mean for others.
        # No fourth feature: this REPLACES (not supplements) temperature_score.
        temp_score = record.get("temperature_score")
        temp_details = {"method": "shared_calendar_months", "score": temp_score}
        if name.casefold() in growing_profiles:
            temp_details = score_frost_free_temperature(name, crop_row, daily, season_details)
            temp_details["method"] = "historical_frost_free_window"
            temp_score = temp_details.get("score")
            # The legacy region filter used fixed May-Sep temperatures. It
            # must not reject a warm-season crop scored using another period.
            if climate_note in hard_fails:
                hard_fails.remove(climate_note)
            if climate_note in unknowns:
                unknowns.remove(climate_note)
            if climate_note in reasons:
                reasons.remove(climate_note)
            if temp_score is not None:
                crop_means = [r["mean_temperature_c"] for r in temp_details["historical_years"]]
                absolute_low = float(crop_row["tmin"])
                absolute_high = float(crop_row["tmax"])
                if all(t < absolute_low or t > absolute_high for t in crop_means):
                    note = (f"Усі історичні безморозні сезони поза допустимим "
                            f"температурним діапазоном ECOCROP "
                            f"{absolute_low:g}–{absolute_high:g} °C.")
                    hard_fails.append(note)
                    reasons.append(note)
            if temp_details.get("summary"):
                reasons.append(temp_details["summary"])
            if temp_details.get("warning"):
                warnings.append(temp_details["warning"])
            # Remove misleading legacy summary based on the shared May-Sep window.
            reasons = [r for r in reasons if not r.startswith((
                "Temperature score averaged across ",
                "Observed mean temperatures ranged from ",
            ))]
        # Legacy helper reports that no other variables are scored. That note is
        # obsolete in main.py, which scores rainfall and pH and checks rotation.
        warnings = [w for w in warnings if not w.startswith(
            "No soil, precipitation suitability, crop rotation")]

        # Rotation information is advice, never an automatic disqualification.
        family_status, family_note = family_filter(name, history, target_year, families)
        rotation_advice = []
        if family_status == "excluded":
            rotation_advice.append("Увага: " + family_note)
        elif family_status == "needs_review":
            rotation_advice.append(family_note)
        else:
            rotation_advice.append(family_note)

        rule = rules.get(name.casefold())
        interval = rule.get("years") if rule else None
        latest = max((year for year, previous in history.items()
                      if previous.strip().casefold() == name.casefold()), default=None)
        elapsed = target_year - latest if latest is not None else None
        if interval is None:
            rotation_advice.append("Інтервал повторного посіву не задано або не застосовується.")
        elif elapsed is None:
            rotation_advice.append(f"Орієнтовний інтервал повторного посіву: {interval} р.; "
                                   "у відомій історії цю культуру не зазначено.")
        elif elapsed < interval:
            rotation_advice.append(f"Орієнтовний інтервал повторного посіву: {interval} р.; "
                                   f"минуло {elapsed} р. Рекомендовано врахувати ризики сівозміни.")
        else:
            rotation_advice.append(f"Орієнтовний інтервал повторного посіву: {interval} р.; "
                                   f"минуло {elapsed} р.")
        reasons.extend(rotation_advice)

        # Three-feature MVP score. Never manufacture scores for missing observations.
        rain = evaluate_precipitation(crop_row, daily, start_year, end_year)
        ph_score = record.get("soil_ph_score")
        if rain.get("summary"):
            reasons.append(rain["summary"])
        if rain.get("warning"):
            warnings.append(rain["warning"])
        if temp_score is None or ph_score is None or rain["score"] is None:
            preliminary_score = None
            unknowns.append("Недостатньо даних для спільної оцінки температури, опадів і pH.")
            if rain["score"] is None:
                unknowns.append(rain["warning"])
        else:
            preliminary_score = round(0.40 * temp_score + 0.35 * rain["score"] + 0.25 * ph_score, 2)

        status = "excluded" if hard_fails else "needs_review" if unknowns else "recommended"
        result = {
            "crop": name,
            "status": status,
            "score": preliminary_score if status == "recommended" else None,
            "preliminary_score": preliminary_score,
            "temperature_score": temp_score,
            "temperature_evaluation": temp_details,
            "soil_ph_score": record.get("soil_ph_score"),
            "precipitation_score": rain["score"],
            "precipitation": rain,
            "recommended_return_years": interval,
            "years_since_same_crop": elapsed,
            "rotation_advice": rotation_advice,
            "same_family_previous_year": family_status == "excluded",
            "winter_cold_risk": cold_details,
            "growing_season": season_details,
            "heat_accumulation_gdd": heat_details,
            "reasons": reasons,
            "exclusion_reasons": hard_fails,
            "review_reasons": unknowns,
            "warnings": warnings,
        }
        {"recommended": recommended, "excluded": excluded, "needs_review": needs_review}[status].append(result)

    recommended.sort(key=lambda r: (-r["score"], r["crop"]))
    excluded.sort(key=lambda r: r["crop"])
    needs_review.sort(key=lambda r: r["crop"])
    return {"recommended": recommended, "excluded": excluded, "needs_review": needs_review}


def main() -> None:
    parser = argparse.ArgumentParser(description="Field Shift: filtering and ranking of all database crops")
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--year", type=int, required=True, help="Target planting year")
    parser.add_argument("--history", required=True, help='"2024:Wheat,2025:Maize,2026:Sunflower"')
    parser.add_argument("--ph", type=float, default=None, help="Manual soil pH override")
    parser.add_argument("--start-year", type=int, default=None, help="First historical year (default: last 10 complete years)")
    parser.add_argument("--end-year", type=int, default=None, help="Last historical year (default: last complete calendar year)")
    parser.add_argument("--climate-years", type=int, default=10, help="Number of complete years when no start-year specified (default: 10)")
    parser.add_argument("--refresh-climate", action="store_true", help="Force NASA POWER download, replacing cached result")
    parser.add_argument("--start-month", type=int, default=5)
    parser.add_argument("--end-month", type=int, default=9)
    parser.add_argument("--crops", type=Path, default=ROOT / "crop_database.csv")
    parser.add_argument("--families", type=Path, default=ROOT / "crop_families.csv")
    parser.add_argument("--rules", type=Path, default=ROOT / "rotation_rules.csv")
    parser.add_argument("--output", type=Path, default=ROOT / "recommendations.json")
    parser.add_argument("--cold-profiles", type=Path, default=ROOT / "cold_risk_profiles.csv")
    parser.add_argument("--growing-profiles", type=Path, default=ROOT / "growing_season_profiles.csv")
    parser.add_argument("--gdd-profiles", type=Path, default=ROOT / "gdd_profiles.csv")
    args = parser.parse_args()

    # A planning year is not a weather forecast year. Use only past complete years.
    # By default, today in 2026 -> 2016–2025 for a 10-year historical baseline.
    if args.climate_years < 1 or args.climate_years > 30:
        parser.error("--climate-years must be between 1 and 30")
    last_complete = date.today().year - 1
    if args.end_year is None:
        args.end_year = min(last_complete, args.year - 1)
    if args.start_year is None:
        args.start_year = args.end_year - args.climate_years + 1
    if args.start_year < 1981:
        parser.error("NASA POWER reference period must begin in 1981 or later")

    if not (-90 <= args.lat <= 90 and -180 <= args.lon <= 180):
        parser.error("Invalid coordinates")
    if args.ph is not None and not 0 <= args.ph <= 14:
        parser.error("pH must be 0..14")
    if args.start_year > args.end_year or args.end_year >= date.today().year:
        parser.error("Historical years must be completed and start <= end")
    if not 1 <= args.start_month <= args.end_month <= 12:
        parser.error("Month range must lie within a calendar year")
    if args.year <= args.end_year:
        parser.error("Target year must be after the historical climate data end year")
    for path in (args.crops, args.families, args.rules, args.cold_profiles, args.growing_profiles, args.gdd_profiles):
        if not path.is_file():
            parser.error(f"Missing file: {path}")

    try:
        history = parse_history(args.history)
        if any(y >= args.year for y in history):
            parser.error("History years must be before the target year")
        crops = read_ecocrop(args.crops)
        families = load_families(args.families)
        rules = load_rotation_rules(args.rules)
        cold_profiles = load_cold_risks(args.cold_profiles)
        growing_profiles = load_profiles(args.growing_profiles)
        gdd_profiles = load_gdd_profiles(args.gdd_profiles)
        if args.ph is None:
            from soilgrids import get_soil_ph
            soil = get_soil_ph(args.lat, args.lon)
            ph, source = soil["soil_ph"], soil["source"]
            print(f"SoilGrids: pH {ph} ({source})")
        else:
            ph, source = args.ph, "manual override"
            print(f"Manual pH: {ph}")

        # Full calendar years are required for winter survival screening.
        start = f"{args.start_year}0101"
        end = f"{args.end_year}1231"
        print(f"NASA POWER: {start}–{end} ({args.lat}, {args.lon})")
        daily = fetch_daily(args.lat, args.lon, start, end, refresh=args.refresh_climate)
        seasons = calculate_season_means(daily, args.start_year, args.end_year, args.start_month, args.end_month)
        period = f"months {args.start_month}-{args.end_month}, {args.start_year}-{args.end_year}"
        temperature = build_ranking(crops, seasons, period)
        soil_ranking = rank_crops_by_soil_ph(args.crops, ph)
        combined = combine_rankings(temperature, soil_ranking, 0.5)  # intermediate scores; final 40/35/25 inside evaluate_all
        groups = evaluate_all(crops, combined, seasons, history, args.year,
                              families, rules, daily, args.start_year, args.end_year, cold_profiles, growing_profiles, gdd_profiles)
    except (OSError, ValueError, RuntimeError, KeyError) as exc:
        parser.error(str(exc))

    payload = {
        "coordinates": {"latitude": args.lat, "longitude": args.lon},
        "target_year": args.year,
        "history": history,
        "soil_ph": ph,
        "soil_ph_source": source,
        "climate_period": period,
        "climate_reference_period": {"start_year": args.start_year, "end_year": args.end_year, "years": args.end_year - args.start_year + 1, "type": "historical_observations_not_forecast"},
        "total_crops": len(crops),
        "counts": {key: len(value) for key, value in groups.items()},
        **groups,
        "limitations": [
            "Prototype only; not validated planting advice.",
            "Annual Tmin screen for explicitly listed frost-sensitive perennial crops; thresholds are editable prototype screening assumptions, not validated survival limits.",
            "Selected outdoor seasonal crops are additionally screened against EcoCrop gmin using estimated historical frost-free periods; this is not a crop calendar or harvest prediction.",
            "Unprofiled crops retain rough seasonal-mean screening; some crops tolerate frost or overwinter and require specialized calendars.",
            "Assumes unprotected outdoor cultivation; protected greenhouse cultivation is not modeled.",
            "Same-family crop succession is flagged as advice, not used to exclude crops.",
            "Return intervals are approximate MVP assumptions; they do not block recommendations.",
            "MVP score: 40% temperature, 35% annual precipitation proxy, 25% soil pH. Temperature uses historical frost-free means for listed warm-season crops, fixed selected months otherwise. Uncalibrated heuristic, not yield probability.",
            "ECOCROP rainfall period is not consistently documented across implementations; annual comparison is a coarse proxy, not growing-season water availability.",
            "GDD is calculated for selected crops with published Tbase, but without verified maturity heat-unit targets it is NOT a suitability score or exclusion rule.",
            "All crops in crop_database.csv are checked; coverage depends on the actual CSV.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nRESULTS: {len(crops)} crops inspected")
    for label in ("recommended", "excluded", "needs_review"):
        rows = groups[label]
        print(f"\n{label.upper()} ({len(rows)}):")
        for i, row in enumerate(rows, 1):
            rating = f" — {row['score']:.2f}/100" if row["score"] is not None else ""
            print(f" {i}. {row['crop']}{rating}")
            if row["score"] is not None:
                print(f"    Scores: T={row['temperature_score']:.1f} | rain={row['precipitation_score']:.1f} | pH={row['soil_ph_score']:.1f}")
                temp_eval = row.get("temperature_evaluation", {})
                if temp_eval.get("method") == "historical_frost_free_window":
                    print(f"    Temp: {temp_eval.get('summary', 'no full temperature data')}")
                rain = row["precipitation"]
                if rain.get("summary"):
                    print(f"    Rain: {rain['summary']}")
                print(f"    Return interval: {row['recommended_return_years']} years" if row['recommended_return_years'] is not None else "    Return interval: N/A")
                for note in row["rotation_advice"]:
                    if "Увага" in note or "Рекомендовано врахувати" in note:
                        print(f"    ~ {note}")
            heat = row.get("heat_accumulation_gdd", {})
            if heat.get("status") == "calculated":
                vals = [v["gdd_c_days"] for v in heat["historical_years"]]
                print(f"    GDD (base {heat['base_temperature_c']:g} C): {min(vals):.0f}–{max(vals):.0f} C·days; maturity requirement unavailable")
            elif heat.get("status") == "base_unknown":
                print("    GDD: no verified crop-specific base temperature; not calculated")
            for message in row["exclusion_reasons"] or row["review_reasons"]:
                print(f"    ! {message}")
    print(f"\nSaved: {args.output}")


if __name__ == "__main__":
    main()
