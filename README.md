# Field Shift — передача Recommendation Engine колезі

## Встановлення

1. Скопіюйте `recommender_service.py` до `G:\Hackathon` поряд з поточним робочим `main.py`.
2. Не замінюйте інші модулі та CSV із вашого працюючого проєкту.
3. `python -m pip install -r requirements.txt` (у віртуальному середовищі).
4. Для тесту без SoilGrids передайте `soil_ph=6.6`. Якщо `soil_ph=None`, використовуватиметься поточний `soilgrids.py`; на деяких координатах він може повернути `NoData`.

```python
from recommender_service import recommend

result = recommend(
    latitude=42.03,
    longitude=-93.62,
    planning_year=2027,
    crop_history={2024: "Wheat", 2025: "Maize", 2026: "Sunflower"},
    soil_ph=6.6,  # None -> SoilGrids; тут тестове значення
)
print(result["counts"])
print(result["recommended"][0]["crop"])
```

`result` — Python `dict`, сумісний із JSON. Функція не створює HTTP API, не викликає CLI й не перезаписує `recommendations.json`. Додатково зберігається кеш NASA POWER у `data/nasa_power_cache/`.

### Параметри
- `latitude`, `longitude`: координати WGS84 у градусах.
- `planning_year`: рік майбутнього посіву.
- `crop_history`: словник `рік: назва культури` (ключі можуть бути рядками з HTTP JSON).
- `soil_ph`: pH вручну або `None` для SoilGrids.
- `climate_years=10`: останні 10 повних календарних років, доступні до року посіву; можна явно задати `start_year`, `end_year`.
- `refresh_climate=False`: використовувати кеш; `True` — оновити дані NASA POWER.
- `start_month=5`, `end_month=9`: період для культур без профілю власного сезону.

### Вихід
- `location`, `planning_year`, `crop_history`, `climate_reference_period`, `soil`, `scoring_weights`.
- `total_crops`, `counts`.
- `recommended`, `excluded`, `needs_review` — масиви культур.
- Поля культури: `crop`, `status`, `score`, `scores`, `rotation`, `reasons`, `warnings`, `exclusion_reasons`, `review_reasons`, `details`.
- `score=null` для виключених або неперевірених культур.

### Для розробника FastAPI

```python
# приклад інтеграції, НЕ готовий сервер:
# from recommender_service import recommend
# @app.post('/recommendations')
# def recommendations(request: RecommendationRequest):
#     return recommend(**request.model_dump())
```

ПРИМІТКА: використовувати Pydantic-схему для валідації полів HTTP-запиту;
передавати `crop_history` як mapping; запити до NASA POWER/SoilGrids блокувальні.
У FastAPI можна викликати `def`-endpoint (виконуватиметься в threadpool),
додати обробку ValueError і RuntimeError та повідомлення про відсутній pH.
На боці frontend не трактувати `score` як імовірність урожаю.

### Обмеження
- Не валідовані агрономічні рекомендації; сівозміна — орієнтовна порада.
- Показники: температура 40%, річні опади 35%, pH 25%.
- Історія NASA POWER, не прогноз 2027/2028.
- Модуль використовує поточні `main.py` та файли проєкту і повинен залишатися поряд із ними.
