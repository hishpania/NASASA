"""Rotation agronomy: how well a crop follows what grew on the field before."""

from collections.abc import Sequence
from dataclasses import dataclass

from .crops import CROPS_BY_ID, FALLOW, Crop

REPEAT_PENALTY = 0.6
SHORT_GAP_PENALTY = 0.7
SAME_FAMILY_PENALTY = 0.9
AFTER_LEGUME_BONUS = 1.15
AFTER_FALLOW_BONUS = 1.05


@dataclass(frozen=True)
class RotationEffect:
    factor: float = 1.0
    reasons: tuple[str, ...] = ()
    cautions: tuple[str, ...] = ()

    @property
    def breaks_rules(self) -> bool:
        return self.factor < SAME_FAMILY_PENALTY


def rotation_effect(crop: Crop, history: Sequence[str]) -> RotationEffect:
    """Scores `crop` as the successor of `history`, most recent season first."""
    if not history:
        return RotationEffect()

    previous = CROPS_BY_ID.get(history[0])
    factor = 1.0
    reasons: list[str] = []
    cautions: list[str] = []

    if history[0] == crop.id and not crop.perennial:
        factor *= REPEAT_PENALTY
        cautions.append(
            f"{crop.name} would follow itself: pests and diseases carry over and yields usually drop without a break crop."
        )
    elif crop.id in history[: crop.rotation_gap_years]:
        factor *= SHORT_GAP_PENALTY
        cautions.append(
            f"{crop.name} grew here within the last {crop.rotation_gap_years} years; "
            "a longer break keeps its soil-borne diseases down."
        )
    elif previous and previous.family == crop.family == "cereal":
        factor *= SAME_FAMILY_PENALTY
        cautions.append(f"A second cereal after {previous.name.lower()} shares its diseases and weeds.")

    if previous and previous.fixes_nitrogen and not crop.fixes_nitrogen:
        factor *= AFTER_LEGUME_BONUS
        reasons.append(f"Follows {previous.name.lower()}, a legume that leaves nitrogen in the soil.")
    if history[0] == FALLOW:
        factor *= AFTER_FALLOW_BONUS
        reasons.append("Follows fallow, so it starts on moisture stored over the rest year.")
    if previous and previous.family != crop.family and history[0] != crop.id:
        reasons.append(f"Breaks the pest and disease cycle of {previous.name.lower()}.")

    return RotationEffect(round(factor, 3), tuple(reasons), tuple(cautions))
