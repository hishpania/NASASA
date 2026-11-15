export type LandUse = { id: string; name: string }

export type AdviceProvider = {
  id: string
  name: string
  kind: 'model' | 'rules'
  description: string
}

export type ClimateSummary = {
  growingDegreeDays: number
  growingDays: number
  seasonTemperature: number
  seasonPrecipitation: number
  annualPrecipitation: number
  soilWetness: number | null
  recordLow: number | null
  source: string
}

export type SoilSummary = {
  name: string
  drainage: string | null
  ph: number | null
  organicMatter: number | null
  clay: number | null
  sand: number | null
  source: string
}

export type Season = {
  year: number | null
  landUse: LandUse
  origin: 'observed' | 'reported'
}

export type SowingDates = { start: string; end: string; maturity: string }

export type Recommendation = {
  crop: LandUse
  score: number
  suitability: number
  probability: number | null
  sowing: SowingDates | null
  reasons: string[]
  cautions: string[]
}

export type StrategyIndicators = {
  climateFit: number
  waterBalance: number
  nitrogen: number
  diversity: number
  pestBreak: number
  soilCover: number
}

export type RotationStrategy = {
  id: string
  name: string
  isCurrent: boolean
  sequence: LandUse[]
  summary: string
  evidence: string[]
  benefits: string[]
  risks: string[]
  indicators: StrategyIndicators
}

export type Advice = {
  provider: AdviceProvider
  latitude: number
  longitude: number
  irrigated: boolean
  climate: ClimateSummary
  soil: SoilSummary | null
  history: Season[]
  recommendations: Recommendation[]
  strategies: RotationStrategy[]
  gaps: string[]
  landUses: LandUse[]
}

export type AdviceOptions = {
  previousCrop: string | null
  irrigated: boolean
}

const monthDayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function formatMonthDay(monthDay: string): string {
  const [month, day] = monthDay.split('-').map(Number)
  return monthDayFormatter.format(new Date(Date.UTC(2001, month - 1, day)))
}

export function formatShare(value: number): string {
  return `${Math.round(value * 100)}%`
}

export type FitLevel = { label: string; tone: 'great' | 'good' | 'fair' | 'poor' }

/** Plain-word reading of a 0–1 score, for people who do not think in percentages. */
export function describeFit(score: number): FitLevel {
  if (score >= 0.8) {
    return { label: 'Great fit', tone: 'great' }
  }
  if (score >= 0.6) {
    return { label: 'Good fit', tone: 'good' }
  }
  if (score >= 0.4) {
    return { label: 'Possible', tone: 'fair' }
  }
  return { label: 'Risky', tone: 'poor' }
}

const DAY_MS = 86_400_000
const YEAR_START = Date.UTC(2001, 0, 1)
const YEAR_DAYS = (Date.UTC(2002, 0, 1) - YEAR_START) / DAY_MS

/** Position of a `MM-DD` date within a (non-leap) year, from 0 to 1. */
export function yearFraction(monthDay: string): number {
  const [month, day] = monthDay.split('-').map(Number)
  return (Date.UTC(2001, month - 1, day) - YEAR_START) / DAY_MS / YEAR_DAYS
}

/** Splits a span of the year into pieces that do not cross the new year, e.g. an autumn sowing that ripens in July. */
export function yearSpans(from: number, to: number): [number, number][] {
  return to >= from ? [[from, to]] : [[from, 1], [0, to]]
}

const monthInitialFormatter = new Intl.DateTimeFormat('en-US', { month: 'narrow', timeZone: 'UTC' })

export const MONTH_INITIALS = Array.from({ length: 12 }, (_, month) =>
  monthInitialFormatter.format(new Date(Date.UTC(2001, month, 1))),
)
