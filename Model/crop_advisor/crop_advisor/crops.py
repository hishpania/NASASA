"""Crop catalog: agronomic requirements and Cropland Data Layer class mapping.

Temperature and pH envelopes follow the FAO ECOCROP convention of (absolute
minimum, optimal minimum, optimal maximum, absolute maximum). Thermal time and
water use are typical values for mid-season varieties. The numbers are meant for
ranking crops against each other, not for agronomic prescriptions.
"""

from dataclasses import dataclass
from typing import Literal

Envelope = tuple[float, float, float, float]
Sowing = Literal["spring", "autumn"]
Family = Literal["cereal", "legume", "oilseed", "fiber", "root", "forage"]


@dataclass(frozen=True)
class Crop:
    id: str
    name: str
    family: Family
    sowing: Sowing
    # Mean air temperature at which sowing starts: reached while warming for
    # spring crops, while cooling for autumn-sown crops.
    sowing_temperature: float
    # Growing degree days above `base_temperature` from sowing to maturity.
    base_temperature: float
    thermal_time: float
    # Mean temperature of the growing days the crop tolerates and prefers.
    temperature: Envelope
    # Seasonal water use of a well-supplied crop, mm.
    water_need: int
    # Rainfall over the cycle at which waterlogging starts to hurt and where the crop fails, mm.
    excess_rainfall: tuple[float, float]
    ph: Envelope
    cdl_codes: tuple[int, ...]
    fixes_nitrogen: bool = False
    deep_rooted: bool = False
    # Leaves a thick residue cover that protects soil and feeds organic matter.
    high_residue: bool = False
    # Years to wait before the crop returns to the same field.
    rotation_gap_years: int = 1
    perennial: bool = False


CROPS: tuple[Crop, ...] = (
    Crop("corn", "Corn", "cereal", "spring", 12, 10, 1350, (10, 18, 33, 40),
         550, (1200, 1800), (5.0, 5.8, 7.5, 8.5), (1, 12, 13), high_residue=True),
    Crop("soybeans", "Soybeans", "legume", "spring", 14, 10, 1200, (10, 20, 33, 38),
         480, (1500, 1800), (4.5, 5.8, 7.3, 8.5), (5, 26, 241), fixes_nitrogen=True),
    Crop("winter_wheat", "Winter wheat", "cereal", "autumn", 15, 0, 2100, (5, 12, 23, 27),
         450, (900, 1600), (5.5, 6.0, 7.5, 8.5), (24,), high_residue=True),
    Crop("spring_wheat", "Spring wheat", "cereal", "spring", 5, 0, 1600, (5, 13, 22, 27),
         400, (900, 1600), (5.5, 6.0, 7.5, 8.5), (22, 23), high_residue=True),
    Crop("barley", "Barley", "cereal", "spring", 4, 0, 1400, (2, 12, 20, 28),
         380, (1000, 2000), (5.5, 6.0, 7.8, 8.5), (21,), high_residue=True),
    Crop("oats", "Oats", "cereal", "spring", 5, 0, 1500, (5, 13, 20, 28),
         400, (1000, 1500), (4.5, 5.0, 7.0, 8.0), (28,), high_residue=True),
    Crop("sorghum", "Sorghum", "cereal", "spring", 16, 10, 1250, (8, 22, 35, 40),
         420, (1000, 3000), (5.0, 5.5, 7.5, 8.5), (4,), high_residue=True),
    Crop("rice", "Rice", "cereal", "spring", 16, 10, 1600, (10, 20, 30, 36),
         1100, (2000, 4000), (4.5, 5.5, 7.0, 9.0), (3,)),
    Crop("cotton", "Cotton", "fiber", "spring", 18, 15.5, 1250, (15, 22, 36, 42),
         700, (1200, 1500), (5.0, 6.0, 7.5, 9.0), (2, 238)),
    Crop("sunflower", "Sunflower", "oilseed", "spring", 10, 6.5, 1350, (5, 17, 30, 40),
         480, (1000, 1600), (5.5, 6.0, 7.5, 8.5), (6,), deep_rooted=True, rotation_gap_years=3),
    Crop("canola", "Canola", "oilseed", "spring", 5, 5, 1050, (5, 12, 22, 30),
         400, (1000, 2800), (5.0, 5.5, 7.5, 8.3), (31, 34), deep_rooted=True, rotation_gap_years=3),
    Crop("peanuts", "Peanuts", "legume", "spring", 19, 13, 1400, (10, 22, 32, 40),
         550, (1500, 4000), (4.5, 5.8, 6.8, 8.5), (10,), fixes_nitrogen=True, rotation_gap_years=2),
    Crop("dry_beans", "Dry beans", "legume", "spring", 14, 10, 1000, (7, 16, 25, 32),
         380, (1200, 2000), (5.0, 5.8, 7.5, 8.2), (42, 51), fixes_nitrogen=True, rotation_gap_years=2),
    Crop("peas", "Field peas", "legume", "spring", 4, 4.5, 950, (4, 10, 20, 27),
         320, (1000, 1500), (5.5, 6.0, 7.5, 8.3), (52, 53), fixes_nitrogen=True, rotation_gap_years=3),
    Crop("sugar_beets", "Sugar beets", "root", "spring", 6, 1, 2600, (4, 14, 24, 32),
         650, (1000, 2000), (5.5, 6.5, 8.0, 8.5), (41,), deep_rooted=True, rotation_gap_years=3),
    Crop("potatoes", "Potatoes", "root", "spring", 8, 7, 1100, (7, 14, 22, 30),
         500, (900, 2000), (4.5, 5.0, 6.5, 8.0), (43,), rotation_gap_years=3),
    Crop("alfalfa", "Alfalfa", "forage", "spring", 8, 5, 1500, (5, 15, 28, 40),
         900, (1200, 2700), (5.5, 6.5, 7.8, 8.7), (36,),
         fixes_nitrogen=True, deep_rooted=True, perennial=True),
)

CROPS_BY_ID: dict[str, Crop] = {crop.id: crop for crop in CROPS}

# Land-use labels that are not crops in the catalog but matter as rotation history.
FALLOW = "fallow"
OTHER_CROP = "other_crop"
NON_CROP = "non_crop"

LAND_USE_NAMES: dict[str, str] = {
    **{crop.id: crop.name for crop in CROPS},
    FALLOW: "Fallow",
    OTHER_CROP: "Other crop",
    NON_CROP: "Not cropland",
}

_CDL_TO_CROP: dict[int, str] = {code: crop.id for crop in CROPS for code in crop.cdl_codes}
_CDL_FALLOW = 61
# CDL classes 1-80 and 200-254 are crops; the rest of 81-199 is non-agricultural land.
_CDL_NON_CROP = range(81, 200)
# Hay and pasture rows of the crop block that behave as grassland, not as an annual crop.
_CDL_GRASSLAND = (37, 58, 59, 60, 62, 176)


def land_use_from_cdl(code: int) -> str | None:
    """Maps a CDL class to a catalog crop or one of the land-use labels. None means no data."""
    if code <= 0:
        return None
    if code in _CDL_TO_CROP:
        return _CDL_TO_CROP[code]
    if code == _CDL_FALLOW:
        return FALLOW
    if code in _CDL_NON_CROP or code in _CDL_GRASSLAND:
        return NON_CROP
    return OTHER_CROP
