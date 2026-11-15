
"""Create a crop database from FAO ECOCROP."""

from pathlib import Path
import pandas as pd

SOURCE = "https://digital-atlas.s3.amazonaws.com/cdh/data/ecocrop/ecocrop.parquet"

CROPS = {
    "Triticum aestivum": "Wheat",
    "Zea mays": "Maize",
    "Glycine max": "Soybean",
    "Helianthus annuus": "Sunflower",
    "Hordeum vulgare": "Barley",
    "Pisum sativum": "Pea",
}

COLUMNS = [
    "scientificname",
    "topmn",
    "topmx",
    "tmin",
    "tmax",
    "ropmn",
    "ropmx",
    "phopmn",
    "phopmx",
    "gmin",
    "gmax",
]


def main():
    data = pd.read_parquet(SOURCE)

    missing_columns = [
        col for col in COLUMNS
        if col not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing source columns: {missing_columns}"
        )

    result = data.loc[
        data["scientificname"].isin(CROPS),
        COLUMNS
    ].copy()

    result.insert(
        1,
        "crop",
        result["scientificname"].map(CROPS)
    )

    result = result.sort_values("crop").reset_index(drop=True)

    output = Path(__file__).with_name("crop_database.csv")

    result.to_csv(
        output,
        index=False,
        encoding="utf-8-sig"
    )

    absent = set(CROPS) - set(result["scientificname"])

    print(result.to_string(index=False))
    print(f"\nSaved {len(result)} rows to {output}")

    if absent:
        print("Missing crops:", ", ".join(sorted(absent)))

    print("Review missing or implausible values before use.")
    print("ECOCROP rainfall requirements are annual values.")


if __name__ == "__main__":
    main()
