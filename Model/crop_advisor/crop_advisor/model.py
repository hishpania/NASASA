"""US crop rotation model.

A gradient boosting classifier that predicts the land use of the coming season
from the climate normals of the field and what grew on it in the two previous
seasons. It is trained on crop sequences observed by the USDA Cropland Data
Layer (see `training/collect.py`), so it reflects what farmers actually do.
"""

import csv
import json
import logging
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier

from .climate import CLIMATE_FEATURES
from .crops import LAND_USE_NAMES

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATASET_PATH = DATA_DIR / "us_training.csv"
MODEL_PATH = DATA_DIR / "us_crop_model.joblib"
METRICS_PATH = DATA_DIR / "us_crop_model.metrics.json"

HISTORY_FEATURES = ("previous_crop", "previous_crop_2")
FEATURES = (*CLIMATE_FEATURES, *HISTORY_FEATURES)
# A land use needs this many examples to be learned as an outcome.
MIN_CLASS_ROWS = 30

_LAND_USE_CODES = {land_use: float(code) for code, land_use in enumerate(LAND_USE_NAMES)}
_UNKNOWN = float("nan")

logger = logging.getLogger(__name__)


def encode(climate_features: dict[str, float], previous: str | None, previous_2: str | None) -> list[float]:
    history = (_LAND_USE_CODES.get(item, _UNKNOWN) if item else _UNKNOWN for item in (previous, previous_2))
    return [*(climate_features[name] for name in CLIMATE_FEATURES), *history]


def load_dataset() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns features, outcomes and the field each row belongs to, without rare outcomes."""
    with DATASET_PATH.open(newline="") as file:
        rows = list(csv.DictReader(file))
    counts = Counter(row["crop"] for row in rows)
    rows = [row for row in rows if counts[row["crop"]] >= MIN_CLASS_ROWS]

    features = np.array([
        encode({name: float(row[name]) for name in CLIMATE_FEATURES}, row["previous_crop"], row["previous_crop_2"])
        for row in rows
    ])
    outcomes = np.array([row["crop"] for row in rows])
    fields = np.array([int(row["point_id"]) for row in rows])
    return features, outcomes, fields


def new_classifier() -> HistGradientBoostingClassifier:
    categorical = [FEATURES.index(name) for name in HISTORY_FEATURES]
    return HistGradientBoostingClassifier(
        categorical_features=categorical,
        # Small, regularised trees: with a few thousand rows a larger model memorises fields
        # and loses to the lookup baseline on fields it has not seen.
        max_iter=80,
        learning_rate=0.05,
        max_leaf_nodes=6,
        min_samples_leaf=40,
        l2_regularization=5.0,
        random_state=0,
    )


class RotationModel:
    def __init__(self, classifier: HistGradientBoostingClassifier, metrics: dict | None = None) -> None:
        self._classifier = classifier
        self.classes: tuple[str, ...] = tuple(map(str, classifier.classes_))
        self.metrics = metrics or {}

    @classmethod
    def train(cls, metrics: dict | None = None) -> "RotationModel":
        features, outcomes, _ = load_dataset()
        model = cls(new_classifier().fit(features, outcomes), metrics)
        model.save()
        return model

    @classmethod
    def load_or_train(cls) -> "RotationModel":
        """Loads the saved model; trains it from the bundled dataset when there is none yet."""
        if MODEL_PATH.exists():
            try:
                return cls(**joblib.load(MODEL_PATH))
            except Exception:
                logger.warning("Saved model could not be loaded, retraining", exc_info=True)
        logger.info("Training the US rotation model from %s", DATASET_PATH.name)
        metrics = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else None
        return cls.train(metrics)

    def save(self) -> None:
        joblib.dump({"classifier": self._classifier, "metrics": self.metrics}, MODEL_PATH)

    def probabilities(self, climate_features: dict[str, float], previous: str | None, previous_2: str | None) -> dict[str, float]:
        """Probability of each land use next season, given the two previous ones."""
        row = np.array([encode(climate_features, previous, previous_2)])
        return dict(zip(self.classes, map(float, self._classifier.predict_proba(row)[0])))
