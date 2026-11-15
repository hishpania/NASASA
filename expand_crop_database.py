"""Expand Field Shift crop catalogue using the actual FAO EcoCrop mirror.

Run in G:\\Hackathon:
    python -m pip install pandas pyarrow
    python expand_crop_database.py

Requires existing crop_database.csv, crop_families.csv, rotation_rules.csv.
Does not invent crop suitability requirements or crop return intervals.
Backups are made before files are replaced. Source is a FAO EcoCrop mirror
(https://cgiar-climate-data-hub.github.io/catalog/ecocrop/).
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
from datetime import datetime
from pathlib import Path

import pandas as pd

SOURCE = 'https://digital-atlas.s3.amazonaws.com/cdh/data/ecocrop/ecocrop.parquet'
ROOT = Path(__file__).resolve().parent
COLUMNS = ('scientificname', 'crop', 'topmn', 'topmx', 'tmin', 'tmax',
           'ropmn', 'ropmx', 'phopmn', 'phopmx', 'gmin', 'gmax')
# Curated *candidate names*, not invented climatic thresholds. Only exact
# scientific-name matches in the source are imported.
CANDIDATES = [
    ('Oryza sativa', 'Rice'),
    ('Solanum tuberosum', 'Potato'),
    ('Solanum lycopersicum', 'Tomato'),
    ('Lycopersicon esculentum', 'Tomato'),  # possible alternate accepted name
    ('Coffea arabica', 'Coffee'),
    ('Theobroma cacao', 'Cocoa'),
    ('Gossypium hirsutum', 'Cotton'),
    ('Sorghum bicolor', 'Sorghum'),
    ('Pennisetum glaucum', 'Pearl millet'),
    ('Cenchrus americanus', 'Pearl millet'),
    ('Avena sativa', 'Oat'),
    ('Secale cereale', 'Rye'),
    ('Brassica napus', 'Rapeseed'),
    ('Brassica oleracea', 'Cabbage'),
    ('Brassica juncea', 'Brown mustard'),
    ('Cicer arietinum', 'Chickpea'),
    ('Lens culinaris', 'Lentil'),
    ('Arachis hypogaea', 'Peanut'),
    ('Beta vulgaris', 'Sugar beet'),
    ('Daucus carota', 'Carrot'),
    ('Allium cepa', 'Onion'),
    ('Allium sativum', 'Garlic'),
    ('Cucumis sativus', 'Cucumber'),
    ('Cucurbita pepo', 'Pumpkin'),
    ('Ipomoea batatas', 'Sweet potato'),
    ('Musa acuminata', 'Banana'),
    ('Manihot esculenta', 'Cassava'),
    ('Phaseolus vulgaris', 'Common bean'),
    ('Vigna unguiculata', 'Cowpea'),
    ('Linum usitatissimum', 'Flax'),
    ('Medicago sativa', 'Alfalfa'),
    ('Saccharum officinarum', 'Sugarcane'),
    ('Coffea canephora', 'Robusta coffee'),
    ('Ananas comosus', 'Pineapple'),
    ('Citrus sinensis', 'Orange'),
    ('Capsicum annuum', 'Bell pepper'),
    ('Raphanus sativus', 'Radish'),
    ('Lactuca sativa', 'Lettuce'),
    ('Spinacia oleracea', 'Spinach'),
    ('Sesamum indicum', 'Sesame'),
    ('Carthamus tinctorius', 'Safflower'),
    ('Eleusine coracana', 'Finger millet'),
]


def read_simple(path: Path, headers: tuple[str, ...]) -> list[dict]:
    with path.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if not set(headers).issubset(reader.fieldnames or []):
            raise ValueError(f'{path.name}: missing columns {set(headers) - set(reader.fieldnames or [])}')
        return list(reader)


def write_csv(path: Path, headers: tuple[str, ...], rows: list[dict]) -> None:
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)


def valid_numeric(row: pd.Series) -> bool:
    # Avoid knowingly malformed threshold combinations; missing data gets
    # needs_review in Field Shift, so we admit records with missing fields.
    def num(key):
        return pd.to_numeric(row.get(key), errors='coerce')
    for low, high in (('tmin', 'tmax'), ('topmn', 'topmx'), ('phopmn', 'phopmx')):
        a, b = num(low), num(high)
        if pd.notna(a) and pd.notna(b) and a > b:
            return False
    tlo, thi, plo, phi = (num(k) for k in ('tmin', 'tmax', 'phopmn', 'phopmx'))
    if pd.notna(tlo) and not -100 <= tlo <= 70:
        return False
    if pd.notna(thi) and not -60 <= thi <= 80:
        return False
    if pd.notna(plo) and not 0 <= plo <= 14:
        return False
    if pd.notna(phi) and not 0 <= phi <= 14:
        return False
    return True


def family_from_record(record: pd.Series) -> str:
    # ECOCROP famname is a colon-delimited taxonomic classification ending
    # with the family, not always a plain family string.
    raw = record.get('famname')
    if not isinstance(raw, str) or not raw.strip():
        return ''
    candidate = raw.split(':')[-1].strip()
    return candidate if candidate and candidate.casefold().endswith('aceae') else ''


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--target', type=int, default=30, help='Total crops, including existing (default: 30)')
    ap.add_argument('--source', default=SOURCE, help='Parquet URL or local .parquet/.csv')
    ap.add_argument('--folder', type=Path, default=ROOT, help='Folder with Field Shift CSVs')
    args = ap.parse_args()
    if args.target < 6:
        ap.error('--target must be at least 6')
    folder = args.folder.resolve()
    crops_file, families_file, rules_file = (folder / name for name in
        ('crop_database.csv', 'crop_families.csv', 'rotation_rules.csv'))
    for f in (crops_file, families_file, rules_file):
        if not f.is_file():
            ap.error(f'Missing {f}. Run this script in G:\\Hackathon alongside existing CSV files.')
    original = pd.read_csv(crops_file, dtype={'scientificname': 'string', 'crop': 'string'})
    if not set(COLUMNS).issubset(original.columns):
        ap.error('Existing crop_database.csv lacks expected columns')
    if original['crop'].duplicated().any() or original['scientificname'].duplicated().any():
        ap.error('Existing crop_database.csv contains duplicates')
    previous_families = read_simple(families_file, ('crop', 'family'))
    previous_rules = read_simple(rules_file, ('crop', 'min_return_years'))

    print('Loading ECOCROP species table (not NASA POWER)...', flush=True)
    if args.source.lower().endswith('.csv'):
        source = pd.read_csv(args.source)
    else:
        source = pd.read_parquet(args.source)
    required = set(COLUMNS) - {'crop'}
    required.add('famname')
    if not required.issubset(source.columns):
        raise ValueError(f'ECOCROP source missing columns: {required - set(source.columns)}')
    names = source['scientificname'].fillna('').astype(str).str.strip().str.casefold()
    if names.duplicated().any():
        print('Warning: duplicate scientific names in source; using first occurrence.')
    source_by_name = dict(zip(names, range(len(source))))

    new_rows, new_family_rows, new_rule_rows, skipped = [], [], [], []
    known_names = {str(x).strip().casefold() for x in original['scientificname']}
    known_crops = {str(x).strip().casefold() for x in original['crop']}
    known_families = {r['crop'].strip().casefold() for r in previous_families}
    known_rules = {r['crop'].strip().casefold() for r in previous_rules}

    for scientific, common in CANDIDATES:
        if len(original) + len(new_rows) >= args.target:
            break
        key = scientific.casefold()
        if key in known_names or common.casefold() in known_crops:
            continue
        ix = source_by_name.get(key)
        if ix is None:
            skipped.append(f'{scientific}: exact name not present')
            continue
        row = source.iloc[ix]
        if not valid_numeric(row):
            skipped.append(f'{scientific}: invalid/inconsistent source thresholds')
            continue
        family = family_from_record(row)
        if not family:
            skipped.append(f'{scientific}: botanical family unavailable/ambiguous')
            continue
        result = {'scientificname': scientific, 'crop': common}
        for col in COLUMNS[2:]:
            result[col] = row[col] if pd.notna(row[col]) else ''
        new_rows.append(result)
        new_family_rows.append({'crop': common, 'family': family})
        # Blank return rule is intentional: new crops need agronomic review.
        new_rule_rows.append({'crop': common, 'min_return_years': ''})
        known_names.add(key)
        known_crops.add(common.casefold())

    # No partial edits on missing source or empty result.
    if not new_rows:
        print('No new crops found. Current count:', len(original))
        return
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backups = folder / f'crop_backup_{timestamp}'
    backups.mkdir(parents=True, exist_ok=False)
    for src in (crops_file, families_file, rules_file):
        shutil.copy2(src, backups / src.name)
    all_crops = pd.concat([original[list(COLUMNS)], pd.DataFrame(new_rows)], ignore_index=True)
    all_crops.to_csv(crops_file, index=False, encoding='utf-8-sig')
    write_csv(families_file, ('crop', 'family'), previous_families + [r for r in new_family_rows if r['crop'].casefold() not in known_families])
    write_csv(rules_file, ('crop', 'min_return_years'), previous_rules + [r for r in new_rule_rows if r['crop'].casefold() not in known_rules])
    report = {'source': args.source, 'total_crops': len(all_crops),
              'added': [{'scientificname': row['scientificname'], 'crop': row['crop'],
                         'family': next(f['family'] for f in new_family_rows if f['crop'] == row['crop'])}
                        for row in new_rows],
              'skipped': skipped, 'backup': str(backups),
              'note': 'New return interval rules deliberately blank; crops need review until rules are supplied. ' +
                      'ECOCROP thresholds are expert estimates, not validated planting advice.'}
    (folder / 'crop_expansion_report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Added {len(new_rows)} crops, now {len(all_crops)} in crop_database.csv')
    print('New:', ', '.join(row['crop'] for row in new_rows))
    print('Backups:', backups)
    print('New rotation intervals intentionally blank -> needs_review until evidence-based rules are added.')
    if skipped:
        print('Skipped:', '; '.join(skipped))
    if len(all_crops) < args.target:
        print(f'Only {len(all_crops)} of requested {args.target} exact-match crops found; not inventing records.')


if __name__ == '__main__':
    main()
