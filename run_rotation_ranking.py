"""Apply crop rotation checks to the output of run_combined_ranking.py.

Example:
python run_rotation_ranking.py --year 2027 --history "2024:Wheat,2025:Maize,2026:Sunflower"

Uses simplified, fixed return intervals from rotation_rules.csv.
"""
import argparse
import json
from pathlib import Path

from rotation_scoring import add_rotation_to_ranking, load_rotation_rules

ROOT = Path(__file__).resolve().parent


def parse_history(value: str) -> dict[int, str]:
    history = {}
    if not value.strip():
        return history
    for entry in value.split(","):
        parts = entry.strip().split(":", 1)
        if len(parts) != 2 or not parts[0].strip().isdigit() or not parts[1].strip():
            raise ValueError(f"Invalid history entry: {entry!r}; expected YEAR:Crop")
        year, crop = int(parts[0]), parts[1].strip()
        if year in history:
            raise ValueError(f"Duplicate history year: {year}")
        history[year] = crop
    return history


def main():
    parser = argparse.ArgumentParser(description="Crop rotation check for Field Shift")
    parser.add_argument("--year", type=int, required=True, help="Year to plant")
    parser.add_argument("--history", required=True,
                        help='Example: "2024:Wheat,2025:Maize,2026:Sunflower"')
    parser.add_argument("--input", type=Path, default=ROOT / "combined_ranking.json")
    parser.add_argument("--rules", type=Path, default=ROOT / "rotation_rules.csv")
    args = parser.parse_args()
    try:
        history = parse_history(args.history)
        data = json.loads(args.input.read_text(encoding="utf-8"))
        rules = load_rotation_rules(args.rules)
        result = add_rotation_to_ranking(data["ranking"], history, args.year,
                                         rules)
    except (ValueError, KeyError, OSError) as exc:
        parser.error(str(exc))
    payload = {"target_year": args.year, "history": history,
               "ranking": result,
               "limitations": [
                   "Checks only simplified crop-specific return intervals from CSV.",
                   "Missing rules are unverified; incomplete history is provisionally allowed with a warning.",
                   "Final score equals temperature+pH score for allowed crops; rotation is an eligibility check.",
                   "Climate screening is temperature-only and soil screening is pH-only.",
                   "Rankings are not validated agronomic recommendations.",
               ]}
    dest = ROOT / "rotation_ranking.json"
    dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    for idx, row in enumerate(result, 1):
        score = f"{row['score']:.1f}/100" if row['score'] is not None else "без фінальної оцінки"
        print(f"{idx}. {row['crop']}: {score} [{row['status']}]")
        for message in row["reasons"]:
            print("   +", message)
        for message in row["warnings"]:
            print("   !", message)
    print("\nSaved:", dest)


if __name__ == "__main__":
    main()
