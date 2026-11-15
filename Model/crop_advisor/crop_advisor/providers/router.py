"""Picks the provider for a point: the first one that covers it and has data for it."""

import logging
from collections.abc import Sequence

from .. import schemas
from .base import AdviceRequest, OutOfCoverage, Provider

logger = logging.getLogger(__name__)


class Advisor:
    def __init__(self, providers: Sequence[Provider]) -> None:
        self._providers = providers

    @property
    def providers(self) -> list[schemas.ProviderInfo]:
        return [provider.info for provider in self._providers]

    async def advise(self, request: AdviceRequest) -> schemas.Advice:
        candidates = [provider for provider in self._providers if provider.covers(request.latitude, request.longitude)]
        skipped: list[str] = []
        for provider in candidates[:-1]:
            try:
                return await provider.advise(request)
            except OutOfCoverage as error:
                logger.info("%s skipped: %s", provider.info.id, error)
                skipped.append(f"{provider.info.name} could not answer for this point: {error}.")

        advice = await candidates[-1].advise(request)
        advice.gaps[:0] = skipped
        return advice
