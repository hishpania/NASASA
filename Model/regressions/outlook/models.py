"""scikit-learn style estimators of below, near or above normal months.

Each estimator forecasts one NASA POWER variable 1 to `horizon` months
ahead, for every grid cell of a region fetched by `data.fetch_region`.
"""

from typing import ClassVar

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.utils.validation import check_is_fitted

from outlook import data

_NOT_FEATURES = frozenset({'origin', 'target', 'value', 'y', 'lo', 'hi'})
_KEYS = ['lat', 'lon', 'month', 'lead']


class Outlook(BaseEstimator):
    """Chance that each coming month is below, near or above normal.

    "Normal" splits a cell's values of a calendar month in the history into
    equal thirds. `fit` trains a gradient boosting classifier on every month
    of the history, pooled over all cells; nothing is held out.
    `predict_proba` forecasts the months after the history's last complete
    month.

    With `backtest_start`, `fit` also scores the model on months it did not
    train on (`track_record_`), and `predict_proba` then reports 1/3 each at
    leads without proven skill.

    Subclasses set the POWER variable and its wording.

    Attributes:
        classes_: The thirds: 'below', 'near', 'above'.
        classifier_: The fitted `HistGradientBoostingClassifier`.
        features_: Names of the features it uses.
        track_record_: Only with `backtest_start`. One row per lead: skill
            (over 1/3 each; 0 is no better), skill_first_half and
            skill_second_half (halves of the scored period), hit_rate (the
            most likely third happened; 1/3 by chance), shown (skill above 0
            in both halves and at least `min_skill`) and confidence ('high',
            'moderate', 'low' or 'no signal').
    """

    CODE: ClassVar[str] = ''
    NAME: ClassVar[str] = ''
    UNITS: ClassVar[str] = ''
    BELOW: ClassVar[str] = ''  # What below normal means, e.g. 'cooler'.
    ABOVE: ClassVar[str] = ''

    def __init__(self, *, horizon: int = 12, max_iter: int = 60,
                 learning_rate: float = 0.05, max_leaf_nodes: int = 4,
                 min_samples_leaf: int = 5000, l2_regularization: float = 1.0,
                 random_state: int | None = 0, backtest_start=None,
                 fold_years: int = 2, min_skill: float = 0.02) -> None:
        """Sets the hyperparameters.

        Args:
            horizon: Months forecast; 1 is the month of the forecast date.
            max_iter: As in `HistGradientBoostingClassifier`.
            learning_rate: Ditto.
            max_leaf_nodes: Ditto. Neighbouring cells move together, so many
                rows hold few independent months: small trees with large
                leaves keep the model from memorising single years.
            min_samples_leaf: Ditto.
            l2_regularization: Ditto.
            random_state: Ditto.
            backtest_start: First forecast date scored by the backtest, e.g.
                '2010-03-01'; None skips it. Earlier history trains the first
                backtest model and sets its normals, so leave decades before.
            fold_years: The backtest retrains every this many years.
            min_skill: Least backtest skill at which a lead keeps its tilt.
        """
        self.horizon = horizon
        self.max_iter = max_iter
        self.learning_rate = learning_rate
        self.max_leaf_nodes = max_leaf_nodes
        self.min_samples_leaf = min_samples_leaf
        self.l2_regularization = l2_regularization
        self.random_state = random_state
        self.backtest_start = backtest_start
        self.fold_years = fold_years
        self.min_skill = min_skill

    def fit(self, X: data.Region, y=None) -> 'Outlook':
        """Trains on every labelled month of the history.

        Args:
            X: History of a region, from `fetch_region`.
            y: Ignored: the labels come from `X`.

        Returns:
            self.
        """
        del y  # The labels are the thirds of the variable in X.
        rows = self._rows(X, X.origin)
        self.classifier_, self.features_ = self._fit_classifier(
            rows[rows.target < X.origin])
        self.classes_ = np.array(['below', 'near', 'above'])
        if self.backtest_start is not None:
            self.track_record_ = self._backtest(X)
        return self

    def predict_proba(self, X: data.Region) -> pd.DataFrame:
        """Forecasts the months after the history of `X`.

        Args:
            X: History of a region, from `fetch_region`; usually the one
                fitted, or a newer one to forecast from a later date.

        Returns:
            One row per cell and month: lat, lon, month, lead, normal_low
            and normal_high (below normal is under normal_low, above normal
            over normal_high), below, near and above (probabilities). After
            a backtest, also skill, hit_rate and confidence, and leads with
            no signal have 1/3 each. `.attrs` holds the variable, its units
            and wording and the forecast date.
        """
        check_is_fitted(self)
        rows = self._rows(X, X.origin)
        now = rows[rows.origin == X.origin]
        probabilities = self.classifier_.predict_proba(now[self.features_])
        frame = pd.DataFrame({
            'lat': now.lat.to_numpy(),
            'lon': now.lon.to_numpy(),
            'month': now.target.to_numpy(),
            'lead': now.lead.to_numpy(),
            'normal_low': now.lo.to_numpy(),
            'normal_high': now.hi.to_numpy(),
        })
        if hasattr(self, 'track_record_'):
            track = self.track_record_.reindex(now.lead)
            probabilities[~track.shown.to_numpy(dtype=bool)] = 1 / 3
            frame = frame.assign(skill=track.skill.to_numpy(),
                                 hit_rate=track.hit_rate.to_numpy(),
                                 confidence=track.confidence.to_numpy())
        for column, (name, values) in enumerate(zip(self.classes_,
                                                    probabilities.T), 6):
            frame.insert(column, name, values)
        frame = frame.sort_values(_KEYS[:3], ignore_index=True)
        frame.attrs = {'variable': self.CODE, 'name': self.NAME,
                       'units': self.UNITS, 'below': self.BELOW,
                       'above': self.ABOVE, 'forecast_date': X.origin}
        return frame

    def predict(self, X: data.Region) -> pd.DataFrame:
        """Returns the most likely third of each coming month.

        Returns:
            lat, lon, month, lead and category: 'below', 'near' or 'above',
            or 'no signal' where the backtest showed no skill.
        """
        proba = self.predict_proba(X)
        category = self.classes_[proba[self.classes_].to_numpy().argmax(1)]
        if 'confidence' in proba:
            category = np.where(proba.confidence == 'no signal', 'no signal',
                                category)
        frame = proba[_KEYS].assign(category=category)
        frame.attrs = proba.attrs
        return frame

    def _rows(self, region: data.Region,
              base_end: pd.Timestamp) -> pd.DataFrame:
        """Returns one row per cell, forecast date and lead.

        Normals and the bounds of the thirds come from months before
        `base_end`, so backtests never see the future.
        """
        variables = list(data.VARIABLES)
        panel = region.power.assign(month=region.power.time.dt.month)
        base = panel[panel.time < base_end].groupby(['lat', 'lon', 'month'])
        normal = base[variables].mean()
        bounds = (base[self.CODE].quantile([1 / 3, 2 / 3]).unstack()
                  .set_axis(['lo', 'hi'], axis=1))

        expected = normal.reindex(
            pd.MultiIndex.from_frame(panel[['lat', 'lon', 'month']]))
        anomaly = panel[['lat', 'lon', 'time']].assign(**dict(zip(
            variables, (panel[variables].to_numpy() - expected.to_numpy()).T)))
        # The forecast date is not observed yet: an empty row lets shift()
        # carry the last months into it.
        cells = panel[['lat', 'lon']].drop_duplicates()
        anomaly = pd.concat([anomaly, cells.assign(time=region.origin)])
        anomaly = anomaly.sort_values(['lat', 'lon', 'time'], ignore_index=True)
        by_cell = anomaly.groupby(['lat', 'lon'])[variables]
        known = pd.concat([  # Known at the start of each month.
            anomaly[['lat', 'lon', 'time']].rename(columns={'time': 'origin'}),
            by_cell.shift(1).add_suffix('_last1'),
            by_cell.transform(lambda s: s.rolling(3).mean().shift(1))
            .add_suffix('_last3'),
        ], axis=1)

        rows = pd.concat([
            known.assign(lead=lead,
                         target=known.origin + pd.DateOffset(months=lead - 1))
            for lead in range(1, self.horizon + 1)], ignore_index=True)
        rows['target_month'] = rows.target.dt.month
        values = panel[['lat', 'lon', 'time', self.CODE]].rename(
            columns={'time': 'target', self.CODE: 'value'})
        rows = rows.merge(values, on=['lat', 'lon', 'target'], how='left')
        rows = rows.merge(
            normal[list(data.TARGETS)].add_prefix('normal_').join(bounds)
            .reset_index().rename(columns={'month': 'target_month'}),
            on=['lat', 'lon', 'target_month'])
        rows['y'] = np.where(rows.value.isna(), np.nan, np.select(
            [rows.value < rows.lo, rows.value <= rows.hi], [0, 1], 2))
        rows['glat'] = np.floor(rows.lat + 0.5)  # Nearest 1-degree node.
        rows['glon'] = np.floor(rows.lon + 0.5)
        rows = rows.merge(region.geos, on=['glat', 'glon', 'origin', 'target'],
                          how='left')
        return rows.drop(columns=['glat', 'glon']).dropna(subset=['T2M_last3'])

    def _fit_classifier(self, rows: pd.DataFrame
                        ) -> tuple[HistGradientBoostingClassifier, list[str]]:
        """Fits the below, near, above classifier on the labelled rows."""
        train = rows[rows.y.notna()]
        # GEOS-S2S columns are empty before 2018.
        used = [c for c in rows.columns
                if c not in _NOT_FEATURES and train[c].notna().any()]
        classifier = HistGradientBoostingClassifier(
            max_iter=self.max_iter, learning_rate=self.learning_rate,
            max_leaf_nodes=self.max_leaf_nodes,
            min_samples_leaf=self.min_samples_leaf,
            l2_regularization=self.l2_regularization, early_stopping=False,
            random_state=self.random_state)
        classifier.fit(train[used], train.y.astype(int))
        if list(classifier.classes_) != [0, 1, 2]:
            raise ValueError(f'{self.CODE}: training data lack a third: '
                             f'{classifier.classes_}.')
        return classifier, used

    def _backtest(self, region: data.Region) -> pd.DataFrame:
        """Scores forecasts from `backtest_start` on, each made by a model
        trained on earlier months only and retrained every `fold_years`."""
        start = pd.Timestamp(self.backtest_start)
        if not region.power.time.min() < start < region.origin:
            raise ValueError(f'backtest_start {start.date()} must lie inside '
                             f'the history.')
        scored = []
        fold = start
        while fold < region.origin:
            end = min(fold + pd.DateOffset(years=self.fold_years),
                      region.origin)
            rows = self._rows(region, fold)
            classifier, used = self._fit_classifier(rows[rows.target < fold])
            test = rows[(rows.origin >= fold) & (rows.origin < end)
                        & rows.y.notna()]
            scored.append(test[['origin', 'lead', 'y']].assign(**dict(zip(
                ('p0', 'p1', 'p2'), classifier.predict_proba(test[used]).T))))
            fold = end
        scored = pd.concat(scored, ignore_index=True)

        # Ranked probability score: squared error of the cumulative
        # probabilities, against 1/3 each as the reference.
        below = (scored.y == 0).astype(float)
        not_above = (scored.y <= 1).astype(float)
        scored['rps'] = ((scored.p0 - below) ** 2
                         + (scored.p0 + scored.p1 - not_above) ** 2)
        scored['ref'] = (1 / 3 - below) ** 2 + (2 / 3 - not_above) ** 2
        scored['hit'] = (scored[['p0', 'p1', 'p2']].to_numpy().argmax(axis=1)
                         == scored.y)
        first = scored.origin < start + (region.origin - start) / 2

        def skill(frame: pd.DataFrame) -> pd.Series:
            means = frame.groupby('lead')[['rps', 'ref']].mean()
            return 1 - means.rps / means.ref

        record = pd.DataFrame({
            'skill': skill(scored),
            'skill_first_half': skill(scored[first]),
            'skill_second_half': skill(scored[~first]),
            'hit_rate': scored.groupby('lead').hit.mean(),
        }).reindex(range(1, self.horizon + 1)).rename_axis('lead')
        halves = record[['skill_first_half', 'skill_second_half']]
        record['shown'] = (halves.min(axis=1) > 0) & (
            record.skill >= self.min_skill)
        levels = pd.cut(record.skill, [-np.inf, 0.1, 0.25, np.inf],
                        labels=['low', 'moderate', 'high']).astype(str)
        record['confidence'] = levels.where(record.shown, 'no signal')
        return record


class AirTemperature(Outlook):
    """Air temperature at 2 m.

    In the 2010-2026 backtest: small, steady skill up to about 9 months
    ahead, mostly from GEOS-S2S and the warming trend.
    """

    CODE = 'T2M'
    NAME = 'Air temperature'
    UNITS = '°C'
    BELOW = 'cooler'
    ABOVE = 'warmer'


class RelativeHumidity(Outlook):
    """Relative humidity at 2 m.

    In the 2010-2026 backtest: skill up to about 4 months ahead.
    """

    CODE = 'RH2M'
    NAME = 'Relative humidity'
    UNITS = '%'
    BELOW = 'drier air'
    ABOVE = 'more humid'


class RootZoneSoilWetness(Outlook):
    """Root zone soil wetness (0 dry to 1 saturated).

    In the 2010-2026 backtest: the strongest skill, up to about 5 months
    ahead, because soil changes slowly.
    """

    CODE = 'GWETROOT'
    NAME = 'Root zone soil wetness'
    UNITS = '0-1'
    BELOW = 'drier'
    ABOVE = 'wetter'
