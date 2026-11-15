"""Wire format of the advice API. Field names are camelCase on the wire."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ProviderInfo(Schema):
    id: str
    name: str
    # "model" is learned from observed crop sequences, "rules" is agronomic rules only.
    kind: str
    description: str


class ClimateSummary(Schema):
    growing_degree_days: float
    growing_days: int
    season_temperature: float
    season_precipitation: float
    annual_precipitation: float
    soil_wetness: float | None
    record_low: float | None
    source: str


class SoilSummary(Schema):
    name: str
    drainage: str | None
    ph: float | None
    organic_matter: float | None
    clay: float | None
    sand: float | None
    source: str


class LandUse(Schema):
    id: str
    name: str


class HistoryEntry(Schema):
    year: int | None
    land_use: LandUse
    # "observed" comes from satellite classification, "reported" from the user.
    origin: str


class SowingDates(Schema):
    """Month-day strings, MM-DD, of an average year."""

    start: str
    end: str
    maturity: str


class Recommendation(Schema):
    crop: LandUse
    score: float
    suitability: float
    probability: float | None
    sowing: SowingDates | None
    reasons: list[str]
    cautions: list[str]


class StrategyIndicators(Schema):
    climate_fit: float
    water_balance: float
    nitrogen: float
    diversity: float
    pest_break: float
    soil_cover: float


class RotationStrategy(Schema):
    id: str
    name: str
    is_current: bool
    sequence: list[LandUse]
    summary: str
    evidence: list[str]
    benefits: list[str]
    risks: list[str]
    indicators: StrategyIndicators


class Advice(Schema):
    provider: ProviderInfo
    latitude: float
    longitude: float
    irrigated: bool
    climate: ClimateSummary
    soil: SoilSummary | None
    history: list[HistoryEntry]
    recommendations: list[Recommendation]
    strategies: list[RotationStrategy]
    # What the advice does not know and a local expert should check.
    gaps: list[str]
    # What the user can report as a previous season of the field.
    land_uses: list[LandUse]


class CropInfo(Schema):
    id: str
    name: str
    family: str
    sowing: str
    fixes_nitrogen: bool
    water_need: int


class ForecastPoint(Schema):
    month: str
    value: float
    normal: float
    low: float | None = None
    high: float | None = None
    method: str | None = None


class ForecastSkill(Schema):
    horizon: int
    model_error: float
    normal_error: float
    method: str


class ForecastSeries(Schema):
    id: str
    name: str
    unit: str
    history: list[ForecastPoint]
    forecast: list[ForecastPoint]
    skill: list[ForecastSkill]


class Forecast(Schema):
    latitude: float
    longitude: float
    last_observed: str
    source: str
    series: list[ForecastSeries]
