"""Прогноз сезону і рейтинг сівозмін за місячним рядом NASA POWER."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, silhouette_score
from sklearn.preprocessing import StandardScaler

POWER_COLUMNS = [
    "ALLSKY_SFC_SW_DWN",
    "GWETROOT",
    "GWETTOP",
    "PRECTOTCORR",
    "RH2M",
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
]
TARGET_COLS = ["T2M", "T2M_MAX", "PRECTOTCORR", "GWETROOT"]
HORIZON_MAX = 18
HOLDOUT_MONTHS = 24
CHOICE_HORIZONS = (1, 3, 6)
RF_PARAMS = dict(
    n_estimators=200,
    max_depth=8,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=1,
)

SEASON_OF_MONTH = {
    12: "зима",
    1: "зима",
    2: "зима",
    3: "весна",
    4: "весна",
    5: "весна",
    6: "літо",
    7: "літо",
    8: "літо",
    9: "осінь",
    10: "осінь",
    11: "осінь",
}

DEFAULT_SOIL = {
    "texture": "silt loam",
    "ph": 6.5,
    "drainage": "moderate",
    "note": "Орієнтир для 40°N, 96°W. Замініть на аналіз свого поля.",
}
DEFAULT_PRIORITIES = {
    "soil_health": 0.30,
    "water": 0.40,
    "climate_fit": 0.30,
}
CROP_TABLE = pd.DataFrame(
    [
        {"crop": "кукурудза", "t_min": 18, "t_max": 30, "t_hot": 36, "drought": 0.25, "water_factor": 1.08, "n_fix": 0.0, "soil_cover": 0.40, "deep_root": 0.30},
        {"crop": "соя", "t_min": 18, "t_max": 30, "t_hot": 36, "drought": 0.50, "water_factor": 0.98, "n_fix": 1.0, "soil_cover": 0.50, "deep_root": 0.40},
        {"crop": "озима пшениця", "t_min": 8, "t_max": 22, "t_hot": 33, "drought": 0.70, "water_factor": 0.90, "n_fix": 0.0, "soil_cover": 0.85, "deep_root": 0.55},
        {"crop": "сорго", "t_min": 20, "t_max": 34, "t_hot": 40, "drought": 0.90, "water_factor": 0.75, "n_fix": 0.0, "soil_cover": 0.45, "deep_root": 0.70},
        {"crop": "люцерна", "t_min": 14, "t_max": 28, "t_hot": 37, "drought": 0.55, "water_factor": 1.05, "n_fix": 0.95, "soil_cover": 0.95, "deep_root": 1.00},
        {"crop": "соняшник", "t_min": 16, "t_max": 32, "t_hot": 38, "drought": 0.80, "water_factor": 0.82, "n_fix": 0.0, "soil_cover": 0.40, "deep_root": 0.85},
    ]
).set_index("crop")
DEFAULT_ROTATIONS = [
    {
        "name": "Поточна",
        "crops": ["кукурудза", "соя", "кукурудза"],
        "why": "База порівняння для цієї точки: кукурудза і соя, на третій рік знову кукурудза.",
    },
    {
        "name": "Спека і посуха",
        "crops": ["сорго", "соя", "озима пшениця"],
        "why": "Сорго витримує спекотний місяць і менші опади, соя повертає азот, пшениця закриває ґрунт узимку.",
    },
    {
        "name": "Здоров'я ґрунту",
        "crops": ["соя", "озима пшениця", "люцерна"],
        "why": "Бобові й зимове покриття тримають ґрунт закритим і відновлюють азот.",
    },
]


def add_months(ts, months: int) -> pd.Timestamp:
    base = pd.Timestamp(ts.year, ts.month, 1)
    shifted = base + pd.DateOffset(months=int(months))
    return pd.Timestamp(shifted.year, shifted.month, 1)


def _safe_r2(y_true, y_pred) -> float:
    if float(np.nanstd(y_true)) < 1e-8:
        return float("nan")
    return float(r2_score(y_true, y_pred))


def _ph_factor(crop_name: str, soil: dict) -> float:
    ph = float(soil["ph"])
    if crop_name == "люцерна" and ph < 6.2:
        return 0.75
    if ph < 5.5 or ph > 8.0:
        return 0.80
    return 1.0


def _band_score(value: float, low: float, high: float, width: float) -> float:
    if low <= value <= high:
        return 1.0
    distance = (low - value) if value < low else (value - high)
    return float(max(0.0, 1.0 - distance / width))


def window_metrics(series: pd.DataFrame, year: int, crop_name: str) -> dict | None:
    """Сезонні опади, температура і вологість коренів для культури."""
    if crop_name == "озима пшениця":
        months = pd.date_range(pd.Timestamp(year - 1, 10, 1), periods=9, freq="MS")
        growth_months = (3, 4, 5, 6)
        heat_months = (4, 5, 6)
    else:
        months = pd.date_range(pd.Timestamp(year, 4, 1), periods=6, freq="MS")
        growth_months = (4, 5, 6, 7, 8, 9)
        heat_months = (4, 5, 6, 7, 8, 9)
    months = pd.DatetimeIndex(months)
    if not months.isin(series.index).all():
        return None
    part = series.loc[months]
    growth = part[part.index.month.isin(growth_months)]
    heat = part[part.index.month.isin(heat_months)]
    if growth.empty or heat.empty:
        return None
    days = pd.Series(part.index, index=part.index).dt.days_in_month
    return {
        "t_mean": float(growth["T2M"].mean()),
        "t_max": float(heat["T2M_MAX"].max()),
        "precip_mm": float((part["PRECTOTCORR"] * days).sum()),
        "gwetroot": float(growth["GWETROOT"].mean()),
    }


def _suitability_parts(metrics, crop_name, crops, gwet_dry, gwet_ref, soil) -> dict:
    crop = crops.loc[crop_name]
    temperature = _band_score(metrics["t_mean"], crop["t_min"], crop["t_max"], 8)
    if metrics["t_max"] <= crop["t_hot"]:
        heat = 1.0
    else:
        heat = max(0.0, 1.0 - (metrics["t_max"] - crop["t_hot"]) / 8.0)
    ratio = metrics["precip_mm"] / float(crop["water_mm"])
    shortfall = max(0.0, 1.0 - ratio)
    rain = float(np.clip(1.0 - shortfall * (1.0 - 0.75 * float(crop["drought"])), 0, 1))
    if metrics["gwetroot"] >= gwet_ref:
        moist = 1.0
    else:
        moist = (metrics["gwetroot"] - gwet_dry) / (gwet_ref - gwet_dry)
    moist = float(np.clip(moist, 0, 1))
    moist = 1.0 - (1.0 - moist) * (1.0 - float(crop["drought"]))
    water = float(np.clip(0.8 * rain + 0.2 * moist, 0, 1))
    factor = _ph_factor(crop_name, soil)
    return {
        "temperature": float(temperature * factor),
        "water": float(water * factor),
        "heat": float(heat * factor),
    }


def _priority_score(climate_fit, water, soil_score, priorities) -> float:
    total = float(sum(priorities.values()))
    return (
        priorities["climate_fit"] * climate_fit
        + priorities["water"] * water
        + priorities["soil_health"] * soil_score
    ) / total


def _soil_sequence_score(crops: list[str], table: pd.DataFrame) -> float:
    rows = table.loc[list(crops)]
    gaps = max(len(crops) - 1, 1)
    repeats = sum(left == right for left, right in zip(crops, crops[1:]))
    diversity = 1.0 - repeats / gaps
    nfix = rows["n_fix"].to_numpy(dtype=float)
    has_fixer = 1.0 if float(nfix.max()) >= 0.8 else 0.0
    handover = 0.0
    for left, right in zip(crops, crops[1:]):
        if float(table.loc[left, "n_fix"]) < 0.5 and float(table.loc[right, "n_fix"]) >= 0.8:
            handover = 1.0
    if handover == 0.0 and float(nfix[0]) >= 0.8:
        handover = 0.5
    nitrogen = 0.6 * has_fixer + 0.4 * handover
    return float(
        0.30 * diversity
        + 0.30 * nitrogen
        + 0.20 * float(rows["soil_cover"].mean())
        + 0.20 * float(rows["deep_root"].mean())
    )


def _rotation_components(crops, year, series, table, gwet_dry, gwet_ref, soil, priorities):
    metrics = {}
    parts = {}
    for crop in crops:
        crop_metrics = window_metrics(series, year, crop)
        if crop_metrics is None:
            return None
        metrics[crop] = crop_metrics
        parts[crop] = _suitability_parts(crop_metrics, crop, table, gwet_dry, gwet_ref, soil)
    climate_fit = float(np.mean([
        0.6 * parts[crop]["temperature"] + 0.4 * parts[crop]["heat"] for crop in crops
    ]))
    water = float(np.mean([parts[crop]["water"] for crop in crops]))
    soil_score = _soil_sequence_score(crops, table)
    return {
        "climate_fit": climate_fit,
        "water": water,
        "soil": soil_score,
        "score": float(_priority_score(climate_fit, water, soil_score, priorities)),
        "metrics": metrics,
        "parts": parts,
    }


def _unique(items: list[str]) -> list[str]:
    seen = []
    for item in items:
        if item not in seen:
            seen.append(item)
    return seen


def _rotation_risks(crops, metrics, parts, table) -> list[str]:
    risks = []
    for crop in crops:
        need = float(table.loc[crop, "water_mm"])
        got = metrics[crop]["precip_mm"]
        if got < 0.9 * need and float(table.loc[crop, "drought"]) < 0.75:
            risks.append(f"{crop}: води менше за орієнтир ({got:.0f} мм проти {need:.0f} мм)")
        if parts[crop]["heat"] < 0.75:
            risks.append(f"{crop}: спекотний місяць, Tmax {metrics[crop]['t_max']:.1f} °C")
    if any(left == right for left, right in zip(crops, crops[1:])):
        risks.append("та сама культура два роки поспіль послаблює структуру ґрунту")
    if float(table.loc[list(crops), "n_fix"].max()) < 0.8:
        risks.append("немає бобової, азот ґрунту не відновлюється")
    risks = _unique(risks)
    if not risks:
        risks.append("явних ризиків за цим сценарієм немає")
    return risks


class RotationModel:
    """Ліс на 1–18 місяців уперед і порівняння трьох сівозмін."""

    def __init__(self, rotations: list[dict] | None = None):
        self.rotations = DEFAULT_ROTATIONS if rotations is None else rotations
        self.climate = None
        self.models_holdout = {}
        self.models_full = {}
        self.metrics = None
        self.method_choice = {}
        self.scenario = None
        self.origin = None
        self.regimes = None
        self.profile = None
        self.best_k = None

    def fit(self, frame: pd.DataFrame) -> "RotationModel":
        """Навчити режими місяців і ліси прогнозу. Повертає себе."""
        missing = [column for column in POWER_COLUMNS if column not in frame.columns]
        if missing:
            raise ValueError(f"У ряді немає колонок POWER: {missing}")
        ordered = [column for column in frame.columns if column in POWER_COLUMNS]
        climate = frame.loc[:, ordered].copy()
        climate.index = pd.DatetimeIndex(pd.to_datetime(climate.index)).normalize()
        self.climate = climate
        self.feature_names = list(climate.columns)
        self.row_by_month = {
            pd.Timestamp(ts): climate.iloc[i] for i, ts in enumerate(climate.index)
        }
        self._fit_regimes()
        samples = self._build_samples()
        self._fit_holdout(samples)
        self._fit_full(samples)
        self._build_scenario()
        return self

    def recommend(
        self,
        soil: dict | None = None,
        priorities: dict | None = None,
    ) -> dict:
        """Порівняти сівозміни на вже побудованому сценарії сезону."""
        if self.scenario is None or self.climate is None or self.origin is None:
            raise RuntimeError("Спочатку виклич fit на ряді з парсера.")
        soil = dict(DEFAULT_SOIL if soil is None else soil)
        priorities = dict(DEFAULT_PRIORITIES if priorities is None else priorities)
        crops = CROP_TABLE.copy()

        warm_rows = self.climate[self.climate.index.month.isin((4, 5, 6, 7, 8, 9))]
        gwet_dry = float(warm_rows["GWETROOT"].quantile(0.10))
        gwet_ref = float(warm_rows["GWETROOT"].median())
        if gwet_ref <= gwet_dry:
            gwet_ref = gwet_dry + 0.01

        observed_years = []
        for year in range(int(self.climate.index.year.min()), int(self.climate.index.year.max()) + 1):
            warm = window_metrics(self.climate, year, "кукурудза")
            wheat = window_metrics(self.climate, year, "озима пшениця")
            if warm is None or wheat is None:
                continue
            observed_years.append({
                "year": year,
                "warm_mm": warm["precip_mm"],
                "warm_t": warm["t_mean"],
                "wheat_mm": wheat["precip_mm"],
            })
        year_table = pd.DataFrame(observed_years)
        if year_table.empty:
            raise RuntimeError("Немає жодного повного сезону в ряді.")
        median_warm = float(year_table["warm_mm"].median())
        median_wheat = float(year_table["wheat_mm"].median())
        crops["water_mm"] = [
            float(crops.loc[crop, "water_factor"]) * (median_wheat if crop == "озима пшениця" else median_warm)
            for crop in crops.index
        ]

        combined = pd.concat([self.climate[TARGET_COLS], self.scenario[TARGET_COLS]])
        combined = combined[~combined.index.duplicated(keep="last")].sort_index()
        plan_year = int(self.origin.year if int(self.origin.month) < 4 else self.origin.year + 1)

        plan_rows = []
        for crop in crops.index:
            metrics = window_metrics(combined, plan_year, crop)
            if metrics is None:
                raise RuntimeError(f"У сценарії немає повного вікна для культури «{crop}», сезон {plan_year}.")
            parts = _suitability_parts(metrics, crop, crops, gwet_dry, gwet_ref, soil)
            plan_rows.append({
                "crop": crop,
                "t_mean": round(metrics["t_mean"], 1),
                "t_max": round(metrics["t_max"], 1),
                "precip_mm": round(metrics["precip_mm"], 0),
                "water_mm": round(float(crops.loc[crop, "water_mm"]), 0),
                "gwetroot": round(metrics["gwetroot"], 2),
                "temperature": round(parts["temperature"], 2),
                "water": round(parts["water"], 2),
                "heat": round(parts["heat"], 2),
            })
        plan_crops = pd.DataFrame(plan_rows).set_index("crop")

        recent_years = [int(year) for year in year_table["year"].tail(5)]
        ranking_rows = []
        risks = {}
        reasons = {}
        for rotation in self.rotations:
            plan = _rotation_components(
                rotation["crops"], plan_year, combined, crops, gwet_dry, gwet_ref, soil, priorities
            )
            if plan is None:
                raise RuntimeError(f"Немає сценарію для сівозміни «{rotation['name']}».")
            past_scores = []
            for year in recent_years:
                past = _rotation_components(
                    rotation["crops"], year, self.climate, crops, gwet_dry, gwet_ref, soil, priorities
                )
                if past is not None:
                    past_scores.append(past["score"])
            if not past_scores:
                raise RuntimeError("Немає повних минулих сезонів для порівняння.")
            history_score = float(np.mean(past_scores))
            risks[rotation["name"]] = _rotation_risks(rotation["crops"], plan["metrics"], plan["parts"], crops)
            reasons[rotation["name"]] = rotation["why"]
            ranking_rows.append({
                "name": rotation["name"],
                "sequence": " → ".join(rotation["crops"]),
                "climate_fit": plan["climate_fit"],
                "water": plan["water"],
                "soil": plan["soil"],
                "plan_score": plan["score"],
                "history_score": history_score,
                "rank_score": 0.6 * plan["score"] + 0.4 * history_score,
            })
        ranking = (
            pd.DataFrame(ranking_rows)
            .sort_values(["rank_score", "soil", "water"], ascending=False)
            .reset_index(drop=True)
        )
        for column in ("climate_fit", "water", "soil", "plan_score", "history_score", "rank_score"):
            ranking[column] = ranking[column].round(3)

        years = year_table["year"].to_numpy(dtype=float)
        slope_t = float(np.polyfit(years, year_table["warm_t"].to_numpy(dtype=float), 1)[0])
        slope_p = float(np.polyfit(years, year_table["warm_mm"].to_numpy(dtype=float), 1)[0])
        warm_plan = window_metrics(combined, plan_year, "кукурудза")
        summary = _summary(
            year_table, slope_t, slope_p, plan_year, warm_plan, median_warm,
            priorities, recent_years, ranking, reasons, risks,
        )
        return {
            "ranking": ranking,
            "risks": risks,
            "reasons": reasons,
            "plan_crops": plan_crops,
            "plan_year": plan_year,
            "trend": {"temperature_c_per_year": slope_t, "precip_mm_per_year": slope_p},
            "warm_season": warm_plan,
            "median_warm_mm": median_warm,
            "method_choice": dict(self.method_choice),
            "metrics": self.metrics,
            "regimes": self.profile,
            "scenario": self.scenario,
            "summary": summary,
        }

    def _fit_regimes(self) -> None:
        scaled = StandardScaler().fit_transform(self.climate)
        silhouettes = {}
        labels_by_k = {}
        for k in range(2, 8):
            labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(scaled)
            labels_by_k[k] = labels
            silhouettes[k] = float(silhouette_score(scaled, labels))
        best_k = max(silhouettes, key=silhouettes.get)
        monthly = self.climate.copy()
        monthly["cluster"] = labels_by_k[best_k]
        regime_names = {}
        for cluster, group in monthly.groupby("cluster"):
            seasons = group.index.month.map(SEASON_OF_MONTH)
            top = seasons.value_counts()
            share = top.iloc[0] / len(group)
            moisture = (
                "вологіша за норму"
                if group["PRECTOTCORR"].mean() >= monthly["PRECTOTCORR"].median()
                else "сухіша за норму"
            )
            if share >= 0.55:
                regime_names[cluster] = f"{top.index[0]}, {moisture}"
            else:
                warmth = "тепла" if group["T2M"].mean() >= monthly["T2M"].median() else "холодна"
                regime_names[cluster] = f"{warmth}, {moisture}"
        counts = pd.Series(list(regime_names.values())).value_counts()
        for cluster, name in list(regime_names.items()):
            if counts[name] > 1:
                t_mean = monthly.loc[monthly["cluster"] == cluster, "T2M"].mean()
                regime_names[cluster] = f"{name}, ~{t_mean:.0f}°C"
        monthly["regime"] = monthly["cluster"].map(regime_names)
        profile = monthly.groupby(["cluster", "regime"])[self.feature_names].mean().round(2)
        profile["n_months"] = monthly.groupby(["cluster", "regime"]).size()
        self.best_k = int(best_k)
        self.silhouettes = silhouettes
        self.regimes = monthly
        self.profile = profile.sort_values("T2M")

    def _features_at(self, origin, horizon: int) -> dict | None:
        origin = add_months(origin, 0)
        row = {}
        for lag in (0, 1, 2):
            ts = add_months(origin, -lag)
            if ts not in self.row_by_month:
                return None
            values = self.row_by_month[ts]
            for column in self.feature_names:
                row[f"{column}_lag{lag}"] = float(values[column])
        target = add_months(origin, horizon)
        anchor = None
        for back in (12, 24, 36):
            cand = add_months(target, -back)
            if cand <= origin and cand in self.row_by_month:
                anchor = cand
                break
        if anchor is None:
            return None
        anchor_values = self.row_by_month[anchor]
        for column in TARGET_COLS:
            row[f"{column}_clim"] = float(anchor_values[column])
        row["month_sin"] = float(np.sin(2 * np.pi * target.month / 12.0))
        row["month_cos"] = float(np.cos(2 * np.pi * target.month / 12.0))
        return row

    def _build_samples(self) -> pd.DataFrame:
        probe = None
        for origin in self.climate.index:
            probe = self._features_at(origin, 1)
            if probe is not None:
                break
        if probe is None:
            raise RuntimeError("Не вистачає історії, щоб зібрати ознаки прогнозу.")
        self.feature_cols = list(probe.keys())
        self.y_cols = [f"y_{column}" for column in TARGET_COLS]
        records = []
        for origin_month in self.climate.index:
            for horizon in range(1, HORIZON_MAX + 1):
                target = add_months(origin_month, horizon)
                if target not in self.row_by_month:
                    continue
                features = self._features_at(origin_month, horizon)
                if features is None:
                    continue
                record = {
                    "horizon": horizon,
                    "target": target,
                    "origin": add_months(origin_month, 0),
                }
                record.update(features)
                target_values = self.row_by_month[target]
                for column in TARGET_COLS:
                    record[f"y_{column}"] = float(target_values[column])
                records.append(record)
        return pd.DataFrame.from_records(records)

    def _predict_frame(self, model, frame: pd.DataFrame) -> pd.DataFrame:
        predicted = model.predict(frame[self.feature_cols])
        out = pd.DataFrame(predicted, index=frame.index, columns=TARGET_COLS)
        out["PRECTOTCORR"] = out["PRECTOTCORR"].clip(lower=0)
        out["GWETROOT"] = out["GWETROOT"].clip(0, 1)
        return out

    def _fit_holdout(self, samples: pd.DataFrame) -> None:
        test_start = add_months(self.climate.index.max(), -(HOLDOUT_MONTHS - 1))
        metric_rows = []
        self.models_holdout = {}
        for horizon in range(1, HORIZON_MAX + 1):
            part = samples.loc[samples["horizon"] == horizon].copy()
            train_mask = part["target"] < test_start
            test_mask = part["target"] >= test_start
            if int(train_mask.sum()) < 30 or int(test_mask.sum()) < 6:
                raise RuntimeError(f"Замало рядків для горизонту {horizon}.")
            model = RandomForestRegressor(**RF_PARAMS)
            model.fit(part.loc[train_mask, self.feature_cols], part.loc[train_mask, self.y_cols])
            self.models_holdout[horizon] = model
            test = part.loc[test_mask].copy()
            predicted = self._predict_frame(model, test)
            actual = test[self.y_cols].copy()
            actual.columns = TARGET_COLS
            naive = test[[f"{column}_clim" for column in TARGET_COLS]].copy()
            naive.columns = TARGET_COLS
            for column in TARGET_COLS:
                metric_rows.append({
                    "horizon": horizon,
                    "target": column,
                    "model": "random_forest",
                    "MAE": mean_absolute_error(actual[column], predicted[column]),
                    "R2": _safe_r2(actual[column], predicted[column]),
                })
                metric_rows.append({
                    "horizon": horizon,
                    "target": column,
                    "model": "seasonal_naive",
                    "MAE": mean_absolute_error(actual[column], naive[column]),
                    "R2": _safe_r2(actual[column], naive[column]),
                })
        self.metrics = pd.DataFrame(metric_rows)
        self.method_choice = {}
        for column in TARGET_COLS:
            subset = self.metrics[
                self.metrics["target"].eq(column) & self.metrics["horizon"].isin(CHOICE_HORIZONS)
            ]
            mae_rf = float(subset.loc[subset["model"].eq("random_forest"), "MAE"].mean())
            mae_naive = float(subset.loc[subset["model"].eq("seasonal_naive"), "MAE"].mean())
            self.method_choice[column] = "random_forest" if mae_rf < mae_naive else "seasonal_naive"

    def _fit_full(self, samples: pd.DataFrame) -> None:
        self.models_full = {}
        for horizon in range(1, HORIZON_MAX + 1):
            part = samples.loc[samples["horizon"] == horizon]
            model = RandomForestRegressor(**RF_PARAMS)
            model.fit(part[self.feature_cols], part[self.y_cols])
            self.models_full[horizon] = model

    def _build_scenario(self) -> None:
        self.origin = self.climate.index.max()
        future_index = [add_months(self.origin, horizon) for horizon in range(1, HORIZON_MAX + 1)]
        scenario = pd.DataFrame(index=pd.DatetimeIndex(future_index), columns=TARGET_COLS, dtype=float)
        for horizon, ts in enumerate(future_index, start=1):
            features = self._features_at(self.origin, horizon)
            if features is None:
                raise RuntimeError(f"Немає ознак для горизонту {horizon}.")
            forest_hat = self._predict_frame(self.models_full[horizon], pd.DataFrame([features])).iloc[0]
            for column in TARGET_COLS:
                if self.method_choice[column] == "random_forest":
                    scenario.at[ts, column] = float(forest_hat[column])
                else:
                    scenario.at[ts, column] = float(features[f"{column}_clim"])
        scenario["PRECTOTCORR"] = scenario["PRECTOTCORR"].clip(lower=0)
        scenario["GWETROOT"] = scenario["GWETROOT"].clip(0, 1)
        self.scenario = scenario


def _summary(year_table, slope_t, slope_p, plan_year, warm_plan, median_warm, priorities, recent_years, ranking, reasons, risks) -> str:
    winner = ranking.iloc[0]
    current = ranking.loc[ranking["name"].eq("Поточна")].iloc[0]
    lines = [
        (
            f"Тренд теплих сезонів {int(year_table['year'].min())}–{int(year_table['year'].max())}: "
            f"температура {slope_t:+.3f} °C/рік, опади {slope_p:+.1f} мм/рік."
        ),
        (
            f"Сценарій {plan_year}: {warm_plan['precip_mm']:.0f} мм за квітень–вересень "
            f"(типово {median_warm:.0f} мм), середня T {warm_plan['t_mean']:.1f} °C, "
            f"найспекотніший місяць {warm_plan['t_max']:.1f} °C."
        ),
        f"Пріоритети: {priorities}",
        (
            "Підсумковий бал = 0.6 × бал наступного сезону + 0.4 × середнє за "
            f"{recent_years[0]}–{recent_years[-1]}."
        ),
        f"Рекомендація: {winner['name']} — {winner['sequence']}.",
        reasons[winner["name"]],
        f"Її бал {winner['rank_score']:.3f}. Поточна сівозміна: {current['rank_score']:.3f}.",
    ]
    if len(ranking) > 1:
        second = ranking.iloc[1]
        gap = float(winner["rank_score"] - second["rank_score"])
        if gap < 0.02:
            lines.append(
                f"Відрив від «{second['name']}» — {gap:.3f}. "
                "Обидві сівозміни попереду поточної і майже рівні між собою: "
                "зміна ваг пріоритетів може поміняти лідера."
            )
    for _, row in ranking.iterrows():
        lines.append(f"{row['name']} ({row['sequence']}): {'; '.join(risks[row['name']])}")
    return "\n".join(lines)


def main() -> None:
    from parser import load_climate

    climate = load_climate()
    print(f"Ряд: {climate.index.min():%Y-%m} — {climate.index.max():%Y-%m}, місяців: {len(climate)}")
    result = RotationModel().fit(climate).recommend()
    print(result["summary"])


if __name__ == "__main__":
    main()
