import calendar
import unittest

from crop_advisor.geo import is_in_conus, to_conus_albers
from crop_advisor.sources import cdl, power, soil


def power_payload(**overrides):
    def series(values):
        return dict(zip((name.upper() for name in calendar.month_abbr[1:]), values)) | {"ANN": 0}

    parameters = {
        "T2M": series([-3, -1, 5, 12, 18, 23, 26, 25, 20, 12, 5, -1]),
        "T2M_MIN": series([-29, -22, -21, -8, -2, 7, 11, 9, 4, -7, -13, -22]),
        "PRECTOTCORR": series([0.6, 1.0, 1.5, 2.8, 4.2, 4.1, 3.2, 3.5, 2.7, 2.3, 1.1, 1.1]),
        "GWETROOT": series([0.6] * 12),
        "RH2M": series([70] * 12),
        "ALLSKY_SFC_SW_DWN": series([15] * 12),
    } | overrides
    return {
        "geometry": {"coordinates": [-96.0, 40.0, 386.5]},
        "header": {"fill_value": -999.0},
        "properties": {"parameter": parameters},
    }


class PowerTests(unittest.TestCase):
    def test_parses_monthly_normals_in_calendar_order(self):
        normals = power.parse(power_payload())
        self.assertEqual(normals.temperature[0], -3)
        self.assertEqual(normals.temperature[6], 26)
        self.assertEqual(normals.elevation, 386.5)
        self.assertEqual((normals.latitude, normals.longitude), (40.0, -96.0))
        self.assertAlmostEqual(normals.annual_precipitation, 856, delta=5)

    def test_missing_temperature_makes_the_point_unusable(self):
        payload = power_payload(T2M={"JAN": -999.0})
        with self.assertRaises(power.ClimateUnavailable):
            power.parse(payload)

    def test_missing_soil_wetness_is_tolerated(self):
        normals = power.parse(power_payload(GWETROOT={}))
        self.assertNotEqual(normals.soil_wetness[0], normals.soil_wetness[0])  # NaN


class CdlTests(unittest.TestCase):
    def test_parses_the_class_code(self):
        body = '<Result>{x: -200000.0, y: 1900000.0, value: 5, category: "Soybeans", color: "#267300"}</Result>'
        self.assertEqual(cdl.parse(body), 5)

    def test_rejects_an_error_response(self):
        with self.assertRaises(ValueError):
            cdl.parse("<faultstring>Error: Failed to get value.</faultstring>")

    def test_query_uses_the_cdl_grid(self):
        self.assertEqual(cdl.query(42.03, -93.63, 2024), {"year": "2024", "x": "194867", "y": "2116698"})


class SoilTests(unittest.TestCase):
    def test_parses_the_dominant_component(self):
        payload = {"Table": [["Hanlon-Spillville complex", "Moderately well drained", "6.5", "2.5", "15", "65.4"]]}
        parsed = soil.parse(payload)
        self.assertEqual(parsed.ph, 6.5)
        self.assertEqual(parsed.drainage, "Moderately well drained")

    def test_no_survey_data_gives_no_soil(self):
        self.assertIsNone(soil.parse({}))

    def test_missing_measurements_stay_empty(self):
        parsed = soil.parse({"Table": [["Water", None, None, "", None, None]]})
        self.assertIsNone(parsed.ph)
        self.assertIsNone(parsed.organic_matter)


class GeoTests(unittest.TestCase):
    def test_projection_origin(self):
        x, y = to_conus_albers(23.0, -96.0)
        self.assertAlmostEqual(x, 0, delta=1e-6)
        self.assertAlmostEqual(y, 0, delta=1e-6)

    def test_conus_coverage(self):
        self.assertTrue(is_in_conus(42.0, -93.6))    # Iowa
        self.assertTrue(is_in_conus(36.7, -119.8))   # California
        self.assertFalse(is_in_conus(50.4, 30.5))    # Kyiv
        self.assertFalse(is_in_conus(51.0, -100.0))  # Manitoba
        self.assertFalse(is_in_conus(19.4, -99.1))   # Mexico City


if __name__ == "__main__":
    unittest.main()
