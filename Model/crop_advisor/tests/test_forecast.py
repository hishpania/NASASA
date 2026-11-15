import math
import random
import unittest

from crop_advisor import forecast
from crop_advisor.sources import power_monthly


def monthly_payload(years=range(2001, 2027), last_month=(2026, 9), gaps=()):
    rng = random.Random(1)
    series = {name: {} for name in power_monthly.PARAMETERS}
    for year in years:
        for month in range(1, 13):
            key = f"{year}{month:02d}"
            observed = (year, month) <= last_month and key not in gaps
            season = math.cos(2 * math.pi * (month - 7) / 12)
            series["T2M"][key] = 12 + 14 * season + rng.gauss(0, 1.5) if observed else -999.0
            series["PRECTOTCORR"][key] = max(0.0, 2 + season + rng.gauss(0, 0.5)) if observed else -999.0
            series["GWETROOT"][key] = 0.55 + 0.05 * season if observed else -999.0
        for name in series:
            series[name][f"{year}13"] = 0.0
    return {
        "geometry": {"coordinates": [32.0, 49.0, 150.0]},
        "header": {"fill_value": -999.0},
        "properties": {"parameter": series},
    }


class MonthlySeriesTests(unittest.TestCase):
    def test_drops_annual_totals_and_unobserved_months(self):
        series = power_monthly.parse(monthly_payload())
        self.assertEqual(series.months[0], (2001, 1))
        self.assertEqual(series.months[-1], (2026, 9))
        self.assertEqual(len(series.months), 25 * 12 + 9)

    def test_fills_a_gap_inside_the_record(self):
        series = power_monthly.parse(monthly_payload(gaps=("201005",)))
        position = series.months.index((2010, 5))
        temperatures = series.values["T2M"]
        self.assertAlmostEqual(temperatures[position], (temperatures[position - 1] + temperatures[position + 1]) / 2)


class ForecastTests(unittest.TestCase):
    def setUp(self):
        self.result = forecast.build(power_monthly.parse(monthly_payload()))

    def test_continues_after_the_last_observed_month(self):
        self.assertEqual(self.result.last_observed, "2026-09")
        temperature = self.result.outlooks[0]
        self.assertEqual(temperature.history[-1].month, "2026-09")
        self.assertEqual(temperature.forecast[0].month, "2026-10")
        self.assertEqual(len(temperature.forecast), forecast.HORIZON)

    def test_band_contains_the_forecast_and_respects_limits(self):
        for outlook in self.result.outlooks:
            for point in outlook.forecast:
                self.assertLessEqual(point.low, point.value)
                self.assertGreaterEqual(point.high, point.value)
                if outlook.indicator.low is not None:
                    self.assertGreaterEqual(point.low, outlook.indicator.low)

    def test_falls_back_to_the_normal_where_the_model_is_not_better(self):
        for outlook in self.result.outlooks:
            for skill, point in zip(outlook.skill, outlook.forecast):
                if skill.method == "normal":
                    self.assertEqual(point.value, point.normal)

    def test_rejects_a_short_record(self):
        with self.assertRaises(ValueError):
            forecast.build(power_monthly.parse(monthly_payload(years=range(2020, 2027))))
