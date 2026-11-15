# Crop Advisor

Sowing recommendations and crop rotation strategies for a field, built for the NASA Space Apps challenge
[Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/).

A FastAPI service. Given a point it answers with:

- **what to sow next**: crops ranked for the coming season, each with a sowing window, the expected maturity date,
  the reasons behind the rank and the cautions;
- **rotation strategies**: three-year plans (the field's current rotation, what similar fields do, soil-building,
  water-saving, erosion-control, best climate fit) scored on the same six indicators;
- **what it does not know**: the gaps a farmer or agronomist should check locally.

## Providers

The first provider that covers the point answers. Both share the same agronomy, so answers are comparable.

| Provider | Where | How |
| --- | --- | --- |
| `us-rotation-model` | Contiguous United States | A gradient boosting model predicts next season's crop from climate normals and the two previous crops. It is trained on crop sequences from the USDA Cropland Data Layer. Its probability is blended with the agronomic fit. Soil pH and drainage come from SSURGO. |
| `global-rules` | Anywhere else | Agronomic rules only: each crop's temperature, thermal time and water needs (FAO ECOCROP style) against the climate normals. Also the fallback when the US data services do not answer. |

Adding a region means adding a class with `covers()` and `advise()` in `crop_advisor/providers/` and listing it in `main.py`.

## Data

| Source | Used for |
| --- | --- |
| [NASA POWER](https://power.larc.nasa.gov/) climatology, 2001–2025 | Monthly temperature, precipitation, root zone soil wetness, humidity, solar radiation: suitability, sowing dates, model features |
| [USDA Cropland Data Layer](https://nassgeodata.gmu.edu/CropScape/) | Crop history of US fields: training labels and rotation context |
| [USDA SSURGO](https://www.nrcs.usda.gov/resources/data-and-reports/soils) via Soil Data Access | Topsoil pH, organic matter, texture and drainage of US fields |

## How a recommendation is built

1. **Sowing window.** Monthly normals are interpolated to days. A spring crop is sown when the air warms to the
   temperature it germinates at, an autumn crop when it cools to it. Where it is warm all year the cycle is placed
   on the rains.
2. **Growing cycle.** The crop grows until it has gathered its thermal time (growing degree days). A season that
   ends first lowers the score.
3. **Suitability.** The mean temperature of the growing days is compared with the crop's envelope; rain over the
   cycle plus the soil moisture at sowing is compared with its water need. The scarcest factor sets the score.
   The `irrigated` option takes water out of the equation.
4. **Rotation.** Repeating a crop, returning it too soon or stacking cereals lowers the score; following a legume
   or a fallow raises it.
5. **Model (US only).** The share of similar fields that planted the crop next is averaged with the agronomic fit.

Crop parameters live in `crop_advisor/crops.py`. They are rounded reference values meant for ranking crops against
each other, not for prescriptions.

## Run

Aspire starts the service together with the rest of the application (`dotnet run --project Backend/src/AppHost`);
it needs [uv](https://docs.astral.sh/uv/) on the PATH. To run it alone:

```bash
uv run uvicorn crop_advisor.main:app --reload
```

- `GET /advice?latitude=42.03&longitude=-93.47` — optional `previousCrops=corn,soybeans` (most recent first) and `irrigated=true`
- `GET /crops`, `GET /providers`, `GET /health`
- Interactive docs at `/docs`

The first start trains the model from `data/us_training.csv` (a few seconds) and saves it next to the dataset.

## Train

```bash
# 1. Rebuild the dataset: random US field points, their CDL history and climate normals (about 40 minutes).
python -m crop_advisor.training.collect --points 650

# 2. Evaluate with whole fields held out, then train on everything.
uv run python -m crop_advisor.training.train
```

Step 2 writes `data/us_crop_model.metrics.json` with the accuracy, the top-3 accuracy and the accuracy of a
lookup baseline (the most common successor of the two previous crops).

## Test

```bash
uv run pytest
```

## Limits

- The model learns what farmers planted, which is common practice and not proof of what is best.
- Climate is described by normals, not by a forecast for the coming season.
- CDL is read at the field center and its newest year lags the calendar; the user can report the last crop instead.
- Markets, equipment and irrigation capacity are not modelled. The advice supports a decision and does not replace
  the farmer or a local agronomist.
