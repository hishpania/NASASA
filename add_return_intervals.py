"""Populate advisory return intervals for Field Shift crops.

Values are approximate MVP defaults for demonstration, not verified local
agronomic prescriptions. Perennial species have no annual return interval.
"""
from __future__ import annotations
import csv
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# Not universal agronomy: illustrative interval assumptions for annual crops.
YEARS = {
 'wheat': 2, 'maize': 2, 'soybean': 3, 'sunflower': 7, 'barley': 1, 'pea': 3,
 'rice': 2, 'potato': 3, 'tomato': 3, 'cotton': 3, 'sorghum': 2,
 'pearl millet': 2, 'oat': 2, 'rye': 2, 'rapeseed': 4, 'cabbage': 3,
 'brown mustard': 3, 'chickpea': 3, 'lentil': 3, 'peanut': 3,
 'sugar beet': 4, 'carrot': 3, 'onion': 3, 'garlic': 3,
 'cucumber': 3, 'pumpkin': 3, 'sweet potato': 3, 'common bean': 3,
 'cowpea': 3, 'flax': 3, 'bell pepper': 3, 'radish': 3,
 'lettuce': 2, 'spinach': 2, 'sesame': 3, 'safflower': 4,
 'finger millet': 2, 'cassava': 3, 'sugarcane': 3,
}
# These are perennials; 0 means not applicable, not "plant every year".
PERENNIAL = {'coffee', 'robusta coffee', 'cocoa', 'banana', 'alfalfa',
             'pineapple', 'orange'}

def main():
    crops_path = ROOT / 'crop_database.csv'
    rules_path = ROOT / 'rotation_rules.csv'
    if not crops_path.exists() or not rules_path.exists():
        raise SystemExit('Run in folder with crop_database.csv and rotation_rules.csv')
    with crops_path.open(encoding='utf-8-sig', newline='') as f:
        names = [r['crop'].strip() for r in csv.DictReader(f)]
    with rules_path.open(encoding='utf-8-sig', newline='') as f:
        previous = {r['crop'].strip().casefold(): r for r in csv.DictReader(f)}
    backup = rules_path.with_name('rotation_rules_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.csv')
    shutil.copy2(rules_path, backup)
    rows=[]
    for name in names:
        key=name.casefold()
        old=(previous.get(key,{}).get('min_return_years') or '').strip()
        if key in PERENNIAL:
            interval=''
            note='Багаторічна культура: інтервал повернення однорічних культур не застосовується.'
        else:
            interval=old if old else str(YEARS.get(key,3))
            note=('Попереднє MVP-правило (орієнтир, не локальний агрономічний норматив).'
                  if old else 'Орієнтовний MVP-інтервал; перевірте для регіону й типу господарства.')
        rows.append({'crop':name,'min_return_years':interval,'advice_note':note})
    with rules_path.open('w', encoding='utf-8-sig', newline='') as f:
        w=csv.DictWriter(f, fieldnames=['crop','min_return_years','advice_note'])
        w.writeheader(); w.writerows(rows)
    print(f'Updated {len(rows)} crops in rotation_rules.csv. Backup: {backup.name}')
    print('Intervals are illustrative, not sourced recommendations. Perennials marked N/A.')

if __name__=='__main__': main()
