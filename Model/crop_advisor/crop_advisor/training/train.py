"""Trains and evaluates the US crop rotation model.

    python -m crop_advisor.training.train

Evaluation holds out whole fields, so the score says how the model does on
fields it has never seen. It is compared with a lookup baseline that always
answers with the most common successor of the two previous crops.
"""

import json
from collections import Counter, defaultdict

import numpy as np
from sklearn.model_selection import GroupKFold

from ..model import FEATURES, HISTORY_FEATURES, METRICS_PATH, RotationModel, load_dataset, new_classifier

FOLDS = 5
TOP = 3


def _baseline(train_x: np.ndarray, train_y: np.ndarray, test_x: np.ndarray) -> np.ndarray:
    previous, previous_2 = (FEATURES.index(name) for name in HISTORY_FEATURES)
    overall = Counter(train_y).most_common(1)[0][0]
    by_pair: dict[tuple, Counter] = defaultdict(Counter)
    by_previous: dict[float, Counter] = defaultdict(Counter)
    for row, outcome in zip(train_x, train_y):
        by_pair[(row[previous], row[previous_2])][outcome] += 1
        by_previous[row[previous]][outcome] += 1

    def answer(row: np.ndarray) -> str:
        counts = by_pair.get((row[previous], row[previous_2])) or by_previous.get(row[previous])
        return counts.most_common(1)[0][0] if counts else overall

    return np.array([answer(row) for row in test_x])


def evaluate() -> dict:
    features, outcomes, fields = load_dataset()
    hits = top_hits = baseline_hits = 0
    for train, test in GroupKFold(FOLDS).split(features, outcomes, fields):
        classifier = new_classifier().fit(features[train], outcomes[train])
        probabilities = classifier.predict_proba(features[test])
        ranked = classifier.classes_[np.argsort(-probabilities, axis=1)[:, :TOP]]
        hits += int((ranked[:, 0] == outcomes[test]).sum())
        top_hits += int((ranked == outcomes[test][:, None]).any(axis=1).sum())
        baseline_hits += int((_baseline(features[train], outcomes[train], features[test]) == outcomes[test]).sum())

    total = len(outcomes)
    return {
        "rows": total,
        "fields": int(len(np.unique(fields))),
        "classes": dict(Counter(outcomes.tolist()).most_common()),
        "validation": f"{FOLDS}-fold, whole fields held out",
        "accuracy": round(hits / total, 3),
        f"top{TOP}Accuracy": round(top_hits / total, 3),
        "baselineAccuracy": round(baseline_hits / total, 3),
    }


if __name__ == "__main__":
    metrics = evaluate()
    METRICS_PATH.write_text(json.dumps(metrics, indent=2) + "\n")
    RotationModel.train(metrics)
    print(json.dumps(metrics, indent=2))
