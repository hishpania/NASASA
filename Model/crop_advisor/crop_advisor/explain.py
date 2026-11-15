"""Turns the numbers behind a recommendation into sentences a farmer can check."""

from .suitability import Suitability


def describe(suitability: Suitability, irrigated: bool) -> tuple[list[str], list[str]]:
    """Returns (reasons, cautions) for the climate side of a recommendation."""
    crop = suitability.crop
    reasons: list[str] = []
    cautions: list[str] = []
    if suitability.sowing is None:
        cautions.append(
            "It never gets warm enough to sow." if suitability.limiting_factor == "temperature"
            else "There is no cool season to sow into."
        )
        return reasons, cautions

    _, prefers_from, prefers_to, _ = crop.temperature
    temperature = suitability.cycle_temperature
    if suitability.temperature_score >= 1:
        reasons.append(
            f"Growing days average {temperature:.0f} °C, inside the {prefers_from:.0f}–{prefers_to:.0f} °C it prefers."
        )
    else:
        side = "cooler" if temperature < prefers_from else "warmer"
        cautions.append(
            f"Growing days average {temperature:.0f} °C, {side} than the {prefers_from:.0f}–{prefers_to:.0f} °C it prefers."
        )

    supply = suitability.water_supply_ratio
    if irrigated:
        reasons.append(f"Irrigated field: its water need of about {crop.water_need} mm is assumed to be met.")
    elif supply >= 0.9:
        reasons.append(
            f"Rain and stored soil moisture cover about {min(supply, 1):.0%} of its {crop.water_need} mm water need."
        )
    else:
        cautions.append(
            f"Rain and stored soil moisture cover only about {supply:.0%} of its {crop.water_need} mm water need; "
            "without irrigation expect water stress."
        )

    wet_limit, _ = crop.excess_rainfall
    if suitability.cycle_rainfall > wet_limit:
        cautions.append(f"About {suitability.cycle_rainfall:.0f} mm of rain over the cycle risks waterlogging and disease.")
    if suitability.season_share < 1:
        cautions.append(
            f"The season provides about {suitability.season_share:.0%} of the heat it needs to mature; "
            "an early variety is required."
        )
    if suitability.limiting_factor == "winter":
        cautions.append("Winters here are cold enough to kill part of the stand without snow cover.")
    if suitability.ph_score is not None and suitability.ph_score < 1:
        _, ph_from, ph_to, _ = crop.ph
        cautions.append(f"Soil pH is outside the {ph_from}–{ph_to} range it prefers.")
    return reasons, cautions
