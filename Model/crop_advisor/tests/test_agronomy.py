import unittest

from crop_advisor import strategies
from crop_advisor.climate import DAYS_IN_YEAR, daily_from_monthly
from crop_advisor.crops import CROPS, CROPS_BY_ID, FALLOW, NON_CROP, OTHER_CROP, land_use_from_cdl
from crop_advisor.rotation import rotation_effect
from crop_advisor.suitability import assess, envelope_score

from .climates import CORN_BELT, DRY_PLAINS, SOUTHERN, TROPICS

MAY_1, JUNE_1, SEPTEMBER_1, NOVEMBER_1 = 120, 151, 243, 304


def assess_all(climate, **options):
    return {crop.id: assess(crop, climate, **options) for crop in CROPS}


class ClimateTests(unittest.TestCase):
    def test_daily_series_passes_through_monthly_means(self):
        daily = daily_from_monthly(CORN_BELT.temperature)
        self.assertEqual(len(daily), DAYS_IN_YEAR)
        self.assertAlmostEqual(daily[15], CORN_BELT.temperature[0], delta=0.3)
        self.assertAlmostEqual(daily[196], CORN_BELT.temperature[6], delta=0.3)

    def test_warm_season_follows_the_hemisphere(self):
        self.assertEqual(CORN_BELT.warm_season, (4, 5, 6, 7, 8, 9))
        self.assertEqual(SOUTHERN.warm_season, (10, 11, 0, 1, 2, 3))


class SuitabilityTests(unittest.TestCase):
    def test_envelope_is_one_inside_optimum_and_zero_outside_limits(self):
        envelope = (10, 18, 30, 40)
        self.assertEqual(envelope_score(20, envelope), 1.0)
        self.assertEqual(envelope_score(5, envelope), 0.0)
        self.assertAlmostEqual(envelope_score(14, envelope), 0.5)
        self.assertAlmostEqual(envelope_score(35, envelope), 0.5)

    def test_corn_fits_the_corn_belt_and_is_sown_in_spring(self):
        corn = assess(CROPS_BY_ID["corn"], CORN_BELT)
        self.assertGreater(corn.score, 0.9)
        self.assertTrue(MAY_1 - 20 <= corn.sowing.start_day <= JUNE_1)
        self.assertTrue(SEPTEMBER_1 - 20 <= corn.sowing.maturity_day <= NOVEMBER_1)

    def test_winter_wheat_is_sown_in_autumn_and_matures_next_summer(self):
        wheat = assess(CROPS_BY_ID["winter_wheat"], CORN_BELT)
        self.assertGreater(wheat.score, 0.8)
        self.assertTrue(SEPTEMBER_1 <= wheat.sowing.start_day <= NOVEMBER_1)
        self.assertTrue(JUNE_1 <= wheat.sowing.maturity_day <= JUNE_1 + 60)

    def test_southern_hemisphere_shifts_sowing_by_half_a_year(self):
        north = assess(CROPS_BY_ID["corn"], CORN_BELT).sowing.start_day
        south = assess(CROPS_BY_ID["corn"], SOUTHERN).sowing.start_day
        self.assertAlmostEqual((south - north) % DAYS_IN_YEAR, DAYS_IN_YEAR / 2, delta=10)

    def test_dry_climate_is_limited_by_water_unless_irrigated(self):
        rainfed = assess(CROPS_BY_ID["corn"], DRY_PLAINS)
        irrigated = assess(CROPS_BY_ID["corn"], DRY_PLAINS, irrigated=True)
        self.assertEqual(rainfed.limiting_factor, "water")
        self.assertLess(rainfed.score, 0.6)
        self.assertGreater(irrigated.score, 0.9)

    def test_drought_tolerant_crops_outrank_thirsty_ones_when_dry(self):
        scores = assess_all(DRY_PLAINS)
        self.assertGreater(scores["sorghum"].score, scores["corn"].score)
        self.assertGreater(scores["corn"].score, scores["rice"].score)

    def test_heat_loving_crop_does_not_mature_in_a_short_season(self):
        cotton = assess(CROPS_BY_ID["cotton"], CORN_BELT)
        self.assertLess(cotton.season_share, 1.0)
        self.assertLess(cotton.score, 0.5)

    def test_tropics_have_no_cool_season_for_winter_wheat(self):
        wheat = assess(CROPS_BY_ID["winter_wheat"], TROPICS)
        self.assertEqual(wheat.score, 0.0)
        self.assertIsNone(wheat.sowing)

    def test_tropical_sowing_follows_the_rains(self):
        corn = assess(CROPS_BY_ID["corn"], TROPICS)
        self.assertGreater(corn.score, 0.8)
        # The wet season runs from October to March.
        self.assertTrue(corn.sowing.start_day >= 270 or corn.sowing.start_day <= 31)

    def test_acid_soil_limits_a_crop_that_needs_neutral_ph(self):
        neutral = assess(CROPS_BY_ID["sugar_beets"], CORN_BELT, soil_ph=7.0)
        acid = assess(CROPS_BY_ID["sugar_beets"], CORN_BELT, soil_ph=5.7)
        self.assertEqual(neutral.ph_score, 1.0)
        self.assertEqual(acid.limiting_factor, "ph")
        self.assertLess(acid.score, neutral.score)


class RotationTests(unittest.TestCase):
    def test_repeating_a_crop_is_penalised(self):
        effect = rotation_effect(CROPS_BY_ID["corn"], ["corn", "soybeans"])
        self.assertLess(effect.factor, 1)
        self.assertTrue(effect.cautions)

    def test_crop_after_a_legume_gets_a_nitrogen_bonus(self):
        effect = rotation_effect(CROPS_BY_ID["corn"], ["soybeans", "corn"])
        self.assertGreater(effect.factor, 1)
        self.assertTrue(any("nitrogen" in reason for reason in effect.reasons))

    def test_crop_with_a_long_break_must_not_return_early(self):
        early = rotation_effect(CROPS_BY_ID["sunflower"], ["spring_wheat", "sunflower"])
        late = rotation_effect(CROPS_BY_ID["sunflower"], ["spring_wheat", "barley", "peas", "sunflower"])
        self.assertLess(early.factor, 1)
        self.assertGreaterEqual(late.factor, 1)

    def test_no_history_has_no_effect(self):
        self.assertEqual(rotation_effect(CROPS_BY_ID["corn"], []).factor, 1.0)


class StrategyTests(unittest.TestCase):
    def test_current_rotation_continues_the_observed_cycle(self):
        history = ["soybeans", "corn", "soybeans", "corn", "soybeans"]
        self.assertEqual(strategies.project_current(history), ("corn", "soybeans", "corn"))
        self.assertEqual(strategies.project_current(["corn", "corn", "corn"]), ("corn", "corn", "corn"))
        self.assertEqual(
            strategies.project_current([FALLOW, "winter_wheat", FALLOW, "winter_wheat"]),
            ("winter_wheat", FALLOW, "winter_wheat"),
        )

    def test_land_that_is_not_cropped_has_no_current_rotation(self):
        self.assertIsNone(strategies.project_current([NON_CROP, NON_CROP]))
        self.assertIsNone(strategies.project_current([]))

    def test_at_least_three_strategies_with_the_current_one_first(self):
        built = strategies.build(assess_all(CORN_BELT), ["corn", "corn", "corn"])
        self.assertGreaterEqual(len(built), 3)
        self.assertTrue(built[0].is_current)
        self.assertEqual(len({strategy.sequence for strategy in built}), len(built))

    def test_alternatives_beat_a_monoculture_on_soil_indicators(self):
        current, *alternatives = strategies.build(assess_all(CORN_BELT), ["corn", "corn", "corn"])
        self.assertEqual(current.indicators["pestBreak"], 0.0)
        self.assertTrue(current.risks)
        soil_building = next(strategy for strategy in alternatives if strategy.id == "soil-building")
        self.assertEqual(soil_building.indicators["nitrogen"], 1.0)
        self.assertGreater(soil_building.indicators["diversity"], current.indicators["diversity"])
        self.assertEqual(soil_building.indicators["pestBreak"], 1.0)

    def test_water_saving_rotation_needs_less_water_than_the_best_fit(self):
        by_id = {strategy.id: strategy for strategy in strategies.build(assess_all(CORN_BELT), ["cotton"])}
        need = lambda strategy: sum(CROPS_BY_ID[item].water_need for item in strategy.sequence)
        self.assertLess(need(by_id["water-saving"]), need(by_id["soil-building"]))

    def test_typical_strategy_follows_the_model(self):
        successor = lambda previous, previous_2: (
            {"corn": 0.8, "soybeans": 0.2} if previous == "soybeans" else {"corn": 0.1, "soybeans": 0.9}
        )
        built = strategies.build(assess_all(CORN_BELT), ["corn", "corn"], successor)
        typical = next(strategy for strategy in built if strategy.id == "typical")
        self.assertEqual(typical.sequence, ("soybeans", "corn", "soybeans"))
        self.assertIn("90%", typical.evidence[0])


class CatalogTests(unittest.TestCase):
    def test_cdl_classes_map_to_land_uses(self):
        self.assertEqual(land_use_from_cdl(1), "corn")
        self.assertEqual(land_use_from_cdl(24), "winter_wheat")
        self.assertEqual(land_use_from_cdl(61), FALLOW)
        self.assertEqual(land_use_from_cdl(141), NON_CROP)
        self.assertEqual(land_use_from_cdl(176), NON_CROP)
        self.assertEqual(land_use_from_cdl(75), OTHER_CROP)
        self.assertIsNone(land_use_from_cdl(0))

    def test_no_cdl_class_belongs_to_two_crops(self):
        codes = [code for crop in CROPS for code in crop.cdl_codes]
        self.assertEqual(len(codes), len(set(codes)))


if __name__ == "__main__":
    unittest.main()
