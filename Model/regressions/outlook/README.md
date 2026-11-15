# outlook

scikit-learn style estimators of 12-month outlooks for every NASA POWER grid cell of a region: the chance that each
coming month is **below, near or above normal**, and optionally the track record that says how far to trust it. This is
the package form of [`exploration/hishpania_outlook.ipynb`](../exploration/hishpania_outlook.ipynb), without plots.

| Estimator | Variable | Skill in the 2010–2026 backtest |
|---|---|---|
| `AirTemperature` | `T2M` | small, up to ~9 months ahead |
| `RelativeHumidity` | `RH2M` | up to ~4 months ahead |
| `RootZoneSoilWetness` | `GWETROOT` | strongest, up to ~5 months ahead |

Precipitation and solar radiation have no estimator: their forecasts never beat chance.

## Install

```bash
pip install -r Model/regressions/outlook/requirements.txt
```

The repository root (for `agdata`) and `Model/regressions` (for `outlook`) must be on the import path, e.g.
`PYTHONPATH=.:Model/regressions`.

No credentials are needed: NASA POWER and NOAA CPC's copy of NASA GEOS-S2S are public.

## Use

```python
from pathlib import Path

import outlook

# The data: history of a region, like a scikit-learn fetch_* dataset. The only async call.
X = await outlook.fetch_region((-97, 40, -90, 44), start='1981-01-01', cache_dir=Path('cache'))

soil = outlook.RootZoneSoilWetness().fit(X)    # Trains on all of X; nothing is held out.
soil.predict_proba(X)                          # Probabilities of the 12 months after X.
soil.predict(X)                                # The most likely third of each month.

# Optional: a backtest scores the model on months it did not train on, and the outlook
# then reports 1/3 each where the model showed no skill.
checked = outlook.RootZoneSoilWetness(backtest_start='2010-03-01').fit(X)
checked.track_record_                          # Skill, hit rate and confidence per lead.
checked.predict_proba(X)                       # With skill, hit_rate and confidence columns.
```

In a script, wrap the `await` in `asyncio.run(...)`.

- **Data** (`fetch_region(bbox, start='1981-01-01', end=None, cache_dir=None)`):
  - The bbox can be up to 10° per side. The estimators pool all its cells, so use a few degrees (about 100 cells); a
    tiny bbox leaves too few independent months to learn from.
  - Forecasts start the month after the last complete month up to `end` (default: today). A past `end` gives the
    outlook as it would have been then.
  - Normals come from the whole history, so keep it decades long. GEOS-S2S forecasts start in 2018-04; earlier forecast
    dates use history only.
  - `cache_dir` keeps GEOS-S2S forecasts. They take about 4 minutes to download the first time for each bbox; later
    calls download only new months.
- **Estimators** are `sklearn.base.BaseEstimator`s:
  - Hyperparameters go to the constructor: `horizon`, the `HistGradientBoostingClassifier` settings,
    `backtest_start`, `fold_years` and `min_skill`.
  - `fit(X)` returns `self`. Fitted attributes end in `_`: `classes_`, `classifier_`, `features_`, `track_record_`.
  - `clone`, `get_params` and `set_params` work.
  - `y` is not passed: the labels are the thirds of the variable in `X`.
- **Speed** on a laptop CPU: `fit` takes ~15 s, and ~1 minute with a backtest.

## Output of `predict_proba(X)`

One row per grid cell and month:

| Column | Meaning |
|---|---|
| `lat`, `lon` | grid cell center |
| `month`, `lead` | target month; months ahead (1 = the forecast month) |
| `normal_low`, `normal_high` | below normal is under `normal_low`, above normal over `normal_high` (thirds of the history) |
| `below`, `near`, `above` | probabilities; after a backtest, 1/3 each where there is no signal |
| `skill` | only after a backtest: improvement over 1/3 each at this lead (0 = no better) |
| `hit_rate` | only after a backtest: how often the most likely third happened (1/3 by chance) |
| `confidence` | only after a backtest: `high`, `moderate`, `low` or `no signal` |

`predict(X)` returns `lat`, `lon`, `month`, `lead` and `category`: `below`, `near`, `above`, or `no signal` after a
backtest. `.attrs` holds the variable code, name, units, what below and above mean (e.g. `cooler` / `warmer`) and the
forecast date.

Use the backtest for anything a farmer sees. Without it, the probabilities are not checked against past performance, and
months beyond the model's skill still show tilts. Stated probabilities above ~70% have been overconfident in the
backtest; read them as "likely".
