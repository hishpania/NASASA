"""Rotation strategies: several multi-year plans for a field, each scored on the same indicators.

Every strategy answers the questions a farmer would ask of it: why it is
suggested, what supports it, what it is good for, and what could go wrong.
"""

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from itertools import permutations

from .crops import CROPS_BY_ID, FALLOW, LAND_USE_NAMES, NON_CROP, OTHER_CROP, Crop
from .rotation import rotation_effect
from .suitability import Suitability

HORIZON_YEARS = 3
VIABLE_SCORE = 0.35
MAX_ROTATION_PERIOD = 4

# Probability of each land use next season, given the two previous ones (most recent first).
Successor = Callable[[str, str | None], Mapping[str, float]]


@dataclass(frozen=True)
class Strategy:
    id: str
    name: str
    sequence: tuple[str, ...]
    is_current: bool
    summary: str
    evidence: tuple[str, ...]
    benefits: tuple[str, ...]
    risks: tuple[str, ...]
    # Each indicator is 0-1, higher is better.
    indicators: Mapping[str, float]


def _listed(crops: Sequence[Crop]) -> str:
    names = [crop.name.lower() for crop in crops]
    return names[0] if len(names) == 1 else f"{', '.join(names[:-1])} and {names[-1]}"


def _names(sequence: Sequence[str]) -> str:
    return " → ".join(LAND_USE_NAMES[item] for item in sequence)


def project_current(history: Sequence[str]) -> tuple[str, ...] | None:
    """Continues the observed rotation for the planning horizon. History is most recent first."""
    known = [item for item in history if item is not None]
    if not known or known[0] == NON_CROP or all(item in (NON_CROP, OTHER_CROP) for item in known):
        return None
    period = next(
        (length for length in range(1, MAX_ROTATION_PERIOD + 1)
         if len(known) > length and all(known[i] == known[i + length] for i in range(len(known) - length))),
        min(len(known), HORIZON_YEARS),
    )
    return tuple(known[(period - 1 - year) % period] for year in range(HORIZON_YEARS))


def _sequence_quality(sequence: Sequence[Crop], history: Sequence[str], suitabilities: Mapping[str, Suitability]) -> float:
    quality = 0.0
    past = list(history)
    for crop in sequence:
        quality += suitabilities[crop.id].score * rotation_effect(crop, past).factor
        past.insert(0, crop.id)
    return quality


def _best_order(crops: Sequence[Crop], history: Sequence[str], suitabilities: Mapping[str, Suitability]) -> tuple[str, ...]:
    best = max(permutations(crops), key=lambda order: _sequence_quality(order, history, suitabilities))
    return tuple(crop.id for crop in best)


def _pick(candidates: Sequence[Crop], taken: Sequence[Crop], *, new_family: bool = False) -> Crop | None:
    families = {crop.family for crop in taken}
    for crop in candidates:
        if crop not in taken and not (new_family and crop.family in families):
            return crop
    return None


def _soil_building(viable: Sequence[Crop]) -> list[Crop]:
    """A legume for nitrogen, a residue-rich cereal for cover, and a third crop from another family."""
    chosen: list[Crop] = []
    for candidates in (
        [crop for crop in viable if crop.fixes_nitrogen],
        [crop for crop in viable if crop.high_residue],
        [crop for crop in viable if crop.deep_rooted],
    ):
        crop = _pick(candidates, chosen)
        if crop:
            chosen.append(crop)
    while len(chosen) < HORIZON_YEARS:
        crop = _pick(viable, chosen, new_family=True) or _pick(viable, chosen)
        if crop is None:
            break
        chosen.append(crop)
    return chosen


def _water_saving(viable: Sequence[Crop]) -> list[Crop]:
    thrifty = sorted(viable, key=lambda crop: crop.water_need)
    chosen = thrifty[:HORIZON_YEARS]
    if len(chosen) == HORIZON_YEARS and len({crop.family for crop in chosen}) == 1:
        other = _pick(thrifty, chosen, new_family=True)
        if other:
            chosen[-1] = other
    return chosen


def _erosion_control(viable: Sequence[Crop]) -> list[Crop]:
    """Crops that keep the ground covered: autumn-sown first, then the residue-rich ones."""
    covering = sorted(viable, key=lambda crop: (crop.sowing != "autumn", not crop.high_residue))
    chosen = covering[:2]
    legume = _pick([crop for crop in viable if crop.fixes_nitrogen], chosen)
    third = legume or _pick(covering, chosen)
    return [*chosen, third] if third else chosen


def _climate_fit(viable: Sequence[Crop]) -> list[Crop]:
    chosen = list(viable[:1])
    while len(chosen) < HORIZON_YEARS:
        crop = _pick(viable, chosen, new_family=True) or _pick(viable, chosen)
        if crop is None:
            break
        chosen.append(crop)
    return chosen


def _typical(history: Sequence[str], successor: Successor) -> tuple[tuple[str, ...], list[float]]:
    """Follows the most likely successor year after year, as the model learned it from real fields."""
    past = [item for item in history[:2]]
    sequence: list[str] = []
    shares: list[float] = []
    for _ in range(HORIZON_YEARS):
        previous = past[0] if past else OTHER_CROP
        probabilities = successor(previous, past[1] if len(past) > 1 else None)
        choice = max(probabilities, key=probabilities.__getitem__)
        sequence.append(choice)
        shares.append(probabilities[choice])
        past.insert(0, choice)
    return tuple(sequence), shares


def indicators(sequence: Sequence[str], history: Sequence[str], suitabilities: Mapping[str, Suitability]) -> dict[str, float]:
    crops = [CROPS_BY_ID[item] for item in sequence if item in CROPS_BY_ID]
    years = len(sequence)
    if not crops:
        return {"climateFit": 0.0, "waterBalance": 1.0, "nitrogen": 0.0, "diversity": 0.0, "pestBreak": 1.0, "soilCover": 0.0}

    violations = 0
    past = list(history)
    for item in sequence:
        if item in CROPS_BY_ID and rotation_effect(CROPS_BY_ID[item], past).breaks_rules:
            violations += 1
        past.insert(0, item)

    supply = [min(suitabilities[crop.id].water_supply_ratio or 0.0, 1.0) for crop in crops]
    covering = [crop for crop in crops if crop.high_residue or crop.perennial or crop.sowing == "autumn"]
    values = {
        "climateFit": sum(suitabilities[crop.id].score for crop in crops) / len(crops),
        "waterBalance": sum(supply) / len(supply),
        "nitrogen": min(sum(crop.fixes_nitrogen for crop in crops) * HORIZON_YEARS / years, 1.0),
        "diversity": min(len({crop.family for crop in crops}) / min(years, HORIZON_YEARS), 1.0),
        "pestBreak": 1 - violations / years,
        "soilCover": len(covering) / years,
    }
    return {name: round(value, 2) for name, value in values.items()}


def _benefits_and_risks(sequence: Sequence[str], history: Sequence[str], suitabilities: Mapping[str, Suitability]):
    crops = [CROPS_BY_ID[item] for item in dict.fromkeys(sequence) if item in CROPS_BY_ID]
    benefits: list[str] = []
    risks: list[str] = []

    legumes = [crop for crop in crops if crop.fixes_nitrogen]
    if legumes:
        benefits.append(f"Nitrogen fixed by {_listed(legumes)} cuts the fertilizer the next crop needs.")
    residue = [crop for crop in crops if crop.high_residue]
    if residue:
        benefits.append(f"Residue of {_listed(residue)} shields the soil from erosion and builds organic matter.")
    deep = [crop for crop in crops if crop.deep_rooted]
    if deep:
        benefits.append(f"Deep roots of {_listed(deep)} open compacted layers and improve infiltration.")
    if any(crop.sowing == "autumn" for crop in crops):
        benefits.append("An autumn-sown crop keeps the field covered through winter, when bare soil erodes most.")
    if len({crop.family for crop in crops}) >= 3:
        benefits.append("Three crop families in three years interrupt pest, disease and weed cycles.")
    if FALLOW in sequence:
        benefits.append("The fallow year stores moisture for the next crop.")

    past = list(history)
    for item in sequence:
        if item in CROPS_BY_ID:
            risks.extend(caution for caution in rotation_effect(CROPS_BY_ID[item], past).cautions if caution not in risks)
        past.insert(0, item)
    for crop in crops:
        suitability = suitabilities[crop.id]
        ratio = suitability.water_supply_ratio
        if suitability.limiting_factor == "water" and ratio is not None and ratio < 0.9:
            risks.append(f"{crop.name}: rain and soil moisture cover only about {ratio:.0%} of the water need.")
        elif suitability.limiting_factor == "season":
            risks.append(f"{crop.name}: the season is short, an early variety is required.")
        elif suitability.limiting_factor == "winter":
            risks.append(f"{crop.name}: risk of winterkill in a cold winter without snow.")
    if FALLOW in sequence:
        risks.append("Bare fallow leaves the soil exposed to wind and water erosion and adds no organic matter.")
    if len(crops) == 1 and len(sequence) > 1:
        risks.append("A single crop year after year depletes the same nutrients and builds up its pests.")
    return tuple(benefits), tuple(risks)


def _evidence(sequence: Sequence[str], suitabilities: Mapping[str, Suitability]) -> list[str]:
    lines = []
    for item in dict.fromkeys(sequence):
        if item not in CROPS_BY_ID:
            continue
        suitability = suitabilities[item]
        ratio = suitability.water_supply_ratio
        water = f", water supply covers {min(ratio, 1):.0%} of its need" if ratio is not None else ""
        lines.append(f"{CROPS_BY_ID[item].name}: climate fit {suitability.score:.0%}{water}.")
    return lines


def build(
    suitabilities: Mapping[str, Suitability],
    history: Sequence[str],
    successor: Successor | None = None,
) -> list[Strategy]:
    """Builds the strategies to compare, the field's current rotation first when it is known."""
    viable = sorted(
        (suitability.crop for suitability in suitabilities.values()
         if suitability.score >= VIABLE_SCORE and not suitability.crop.perennial),
        key=lambda crop: -suitabilities[crop.id].score,
    )
    strategies: list[Strategy] = []

    def add(strategy_id: str, name: str, sequence: tuple[str, ...], summary: str, evidence: Sequence[str] = (), *, is_current: bool = False) -> None:
        if len(sequence) < 2 or any(existing.sequence == sequence for existing in strategies):
            return
        benefits, risks = _benefits_and_risks(sequence, history, suitabilities)
        strategies.append(Strategy(
            id=strategy_id,
            name=name,
            sequence=sequence,
            is_current=is_current,
            summary=summary,
            evidence=(*evidence, *_evidence(sequence, suitabilities)),
            benefits=benefits,
            risks=risks,
            indicators=indicators(sequence, history, suitabilities),
        ))

    current = project_current(history)
    if current:
        add(
            "current", "Current rotation", current,
            f"The rotation this field has followed, continued for {HORIZON_YEARS} more years. "
            "It is the baseline the alternatives are compared against.",
            [f"Recent seasons, newest first: {_names([item for item in history if item])}."],
            is_current=True,
        )

    if successor:
        sequence, shares = _typical(history, successor)
        add(
            "typical", "Typical for similar fields", sequence,
            "What farmers most often plant next on US fields with a similar climate and the same recent crops, "
            "as learned from the USDA Cropland Data Layer.",
            [f"Year {year}: {LAND_USE_NAMES[item]} followed in {share:.0%} of comparable cases."
             for year, (item, share) in enumerate(zip(sequence, shares), start=1)],
        )

    if len(viable) >= 2:
        add(
            "soil-building", "Soil-building rotation", _best_order(_soil_building(viable), history, suitabilities),
            "Combines a nitrogen-fixing legume, a residue-rich cereal and a deep-rooted or different-family crop "
            "to rebuild soil structure and fertility.",
        )
        add(
            "water-saving", "Water-saving rotation", _best_order(_water_saving(viable), history, suitabilities),
            "Uses the suitable crops with the lowest water demand, for fields where rain and soil moisture are the limit.",
        )
        add(
            "erosion-control", "Erosion-control rotation", _best_order(_erosion_control(viable), history, suitabilities),
            "Keeps the soil covered for most of the rotation with autumn-sown and residue-rich crops, "
            "for sloping fields and soils that wash or blow away.",
        )
        add(
            "climate-fit", "Best climate fit", _best_order(_climate_fit(viable), history, suitabilities),
            "The crops whose temperature and water needs match this field's climate normals most closely, "
            "taken from different families.",
        )
    return strategies
