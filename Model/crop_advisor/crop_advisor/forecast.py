"""Monthly outlook of a point: the observed months and a forecast for the year ahead."""

import calendar
import math
from dataclasses import dataclass
from datetime import date

import numpy as np
from sklearn.ensemble import RandomForestRegressor

from .sources.power_monthly import Month, MonthlySeries

HORIZON = 12
HISTORY_MONTHS = 24
HOLDOUT_MONTHS = 24
LAGS = 3
BAND_Z = 1.28
MAE_TO_SIGMA = 1.25
MIN_TRAINING_ROWS = 60
SEASON_MONTHS = 3

FOREST = dict(n_estimators=150, max_depth=6, min_samples_leaf=3, random_state=42, n_jobs=1)


@dataclass(frozen=True)
class Indicator:
    id: str
    parameter: str
    name: str
    unit: str
    low: float | None = None
    high: float | None = None


INDICATORS = (
    Indicator("temperature", "T2M", "Mean air temperature", "°C"),
    Indicator("precipitation", "PRECTOTCORR", "Precipitation", "mm", low=0.0),
    Indicator("soil_wetness", "GWETROOT", "Root zone soil wetness", "0-1", low=0.0, high=1.0),
)


@dataclass(frozen=True)
class Point:
    month: str
    value: float
    normal: float
    low: float | None = None
    high: float | None = None
    method: str | None = None


@dataclass(frozen=True)
class Skill:
    horizon: int
    model_error: float
    normal_error: float
    method: str


@dataclass(frozen=True)
class Season:
    start: str
    end: str
    below: int
    near: int
    above: int
    lower: float
    upper: float
    method: str


@dataclass(frozen=True)
class Outlook:
    indicator: Indicator
    history: list[Point]
    forecast: list[Point]
    skill: list[Skill]
    season: Season


@dataclass(frozen=True)
class Forecast:
    latitude: float
    longitude: float
    last_observed: str
    outlooks: list[Outlook]


def _shift(month: Month, months: int) -> Month:
    index = month[0] * 12 + month[1] - 1 + months
    return index // 12, index % 12 + 1


def _label(month: Month) -> str:
    return f"{month[0]:04d}-{month[1]:02d}"


def _monthly_values(series: MonthlySeries, indicator: Indicator) -> np.ndarray:
    values = np.array(series.values[indicator.parameter], dtype=float)
    if indicator.parameter == "PRECTOTCORR":
        days = np.array([calendar.monthrange(year, month)[1] for year, month in series.months], dtype=float)
        values = values * days
    return values


def _normals(values: np.ndarray, calendar_months: np.ndarray, until: int) -> np.ndarray:
    return np.array([values[:until][calendar_months[:until] == month].mean() for month in range(1, 13)])


def _features(anomalies: np.ndarray, normals: np.ndarray, origin: int, target_month: int) -> list[float]:
    lagged = anomalies[:, origin - LAGS + 1:origin + 1][:, ::-1].ravel()
    angle = 2 * np.pi * (target_month - 1) / 12
    return [*lagged, *normals[:, target_month - 1], np.sin(angle), np.cos(angle)]


def _samples(anomalies, normals, calendar_months, horizon, origins):
    rows, targets = [], []
    for origin in origins:
        target = origin + horizon
        rows.append(_features(anomalies, normals, origin, calendar_months[target]))
        targets.append(anomalies[:, target])
    return np.array(rows), np.array(targets)


def _clip(indicator: Indicator, value: float) -> float:
    low = -np.inf if indicator.low is None else indicator.low
    high = np.inf if indicator.high is None else indicator.high
    return float(np.clip(value, low, high))


def _cdf(value: float) -> float:
    return 0.5 * (1 + math.erf(value / math.sqrt(2)))


def _season_offset(last: Month, today: date) -> int:
    ahead = (today.year * 12 + today.month) - (last[0] * 12 + last[1])
    return int(np.clip(ahead - 1, 0, HORIZON - SEASON_MONTHS))


def _season(indicator, anomalies, normals, calendar_months, months, predictions, skills) -> Season:
    combine = np.sum if indicator.id == "precipitation" else np.mean
    first = months[0][1]
    starts = [p for p in range(len(calendar_months) - SEASON_MONTHS + 1) if calendar_months[p] == first]
    past = np.array([combine(anomalies[p:p + SEASON_MONTHS]) for p in starts])
    lower, upper = np.quantile(past, [1 / 3, 2 / 3])
    window = skills
    ratio = np.mean([min(entry.model_error, entry.normal_error) / entry.normal_error for entry in window])
    spread = float(past.std(ddof=1)) * ratio
    center = float(combine(predictions))
    if spread > 0 and ratio < 1:
        below = round(100 * _cdf((lower - center) / spread))
        above = round(100 * (1 - _cdf((upper - center) / spread)))
    else:
        below = above = 33
    method = "model" if any(entry.method == "model" for entry in window) else "normal"
    normal = float(combine(np.array([normals[month - 1] for _, month in months])))
    digits = 2 if indicator.id == "soil_wetness" else 1
    return Season(
        start=_label(months[0]),
        end=_label(months[-1]),
        below=below,
        near=100 - below - above,
        above=above,
        lower=round(_clip(indicator, normal + lower), digits),
        upper=round(_clip(indicator, normal + upper), digits),
        method=method,
    )


def build(series: MonthlySeries, today: date | None = None) -> Forecast:
    count = len(series.months)
    calendar_months = np.array([month for _, month in series.months])
    values = np.vstack([_monthly_values(series, indicator) for indicator in INDICATORS])
    test_start = count - HOLDOUT_MONTHS
    if test_start - LAGS - HORIZON < MIN_TRAINING_ROWS:
        raise ValueError("Not enough monthly history to forecast this point")

    train_normals = np.vstack([_normals(row, calendar_months, test_start) for row in values])
    train_anomalies = values - train_normals[:, calendar_months - 1]
    full_normals = np.vstack([_normals(row, calendar_months, count) for row in values])
    full_anomalies = values - full_normals[:, calendar_months - 1]

    skill: dict[str, list[Skill]] = {indicator.id: [] for indicator in INDICATORS}
    predictions = np.zeros((len(INDICATORS), HORIZON))
    last = count - 1
    for horizon in range(1, HORIZON + 1):
        train_origins = [o for o in range(LAGS - 1, test_start - horizon)]
        test_origins = [o for o in range(max(LAGS - 1, test_start - horizon), count - horizon)]
        x_train, y_train = _samples(train_anomalies, train_normals, calendar_months, horizon, train_origins)
        x_test, y_test = _samples(train_anomalies, train_normals, calendar_months, horizon, test_origins)
        forest = RandomForestRegressor(**FOREST).fit(x_train, y_train)
        model_errors = np.abs(forest.predict(x_test) - y_test).mean(axis=0)
        normal_errors = np.abs(y_test).mean(axis=0)

        all_origins = list(range(LAGS - 1, count - horizon))
        x_all, y_all = _samples(full_anomalies, full_normals, calendar_months, horizon, all_origins)
        full = RandomForestRegressor(**FOREST).fit(x_all, y_all)
        target_month = _shift(series.months[last], horizon)[1]
        anomaly = full.predict([_features(full_anomalies, full_normals, last, target_month)])[0]

        for index, indicator in enumerate(INDICATORS):
            use_model = model_errors[index] < normal_errors[index]
            method = "model" if use_model else "normal"
            skill[indicator.id].append(
                Skill(horizon, float(model_errors[index]), float(normal_errors[index]), method)
            )
            predictions[index, horizon - 1] = anomaly[index] if use_model else 0.0

    offset = _season_offset(series.months[last], today or date.today())
    outlooks = []
    for index, indicator in enumerate(INDICATORS):
        digits = 2 if indicator.id == "soil_wetness" else 1
        history = [
            Point(
                month=_label(series.months[position]),
                value=round(float(values[index, position]), digits),
                normal=round(float(full_normals[index, calendar_months[position] - 1]), digits),
            )
            for position in range(max(0, count - HISTORY_MONTHS), count)
        ]
        forecast = []
        for horizon in range(1, HORIZON + 1):
            month = _shift(series.months[last], horizon)
            normal = float(full_normals[index, month[1] - 1])
            entry = skill[indicator.id][horizon - 1]
            spread = BAND_Z * MAE_TO_SIGMA * min(entry.model_error, entry.normal_error)
            value = normal + predictions[index, horizon - 1]
            forecast.append(
                Point(
                    month=_label(month),
                    value=round(_clip(indicator, value), digits),
                    normal=round(normal, digits),
                    low=round(_clip(indicator, value - spread), digits),
                    high=round(_clip(indicator, value + spread), digits),
                    method=entry.method,
                )
            )
        season = _season(
            indicator,
            full_anomalies[index],
            full_normals[index],
            calendar_months,
            [_shift(series.months[last], offset + step) for step in range(1, SEASON_MONTHS + 1)],
            predictions[index, offset:offset + SEASON_MONTHS],
            skill[indicator.id][offset:offset + SEASON_MONTHS],
        )
        outlooks.append(Outlook(indicator, history, forecast, skill[indicator.id], season))

    return Forecast(series.latitude, series.longitude, _label(series.months[last]), outlooks)
