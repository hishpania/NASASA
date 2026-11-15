export type ForecastMethod = 'model' | 'normal'

export type ForecastPoint = {
  month: string
  value: number
  normal: number
  low: number | null
  high: number | null
  method: ForecastMethod | null
}

export type ForecastSkill = {
  horizon: number
  modelError: number
  normalError: number
  method: ForecastMethod
}

export type ForecastSeason = {
  start: string
  end: string
  below: number
  near: number
  above: number
  lower: number
  upper: number
  method: ForecastMethod
}

export type ForecastSeriesId = 'temperature' | 'precipitation' | 'soil_wetness'

export type ForecastSeries = {
  id: ForecastSeriesId
  name: string
  unit: string
  history: ForecastPoint[]
  forecast: ForecastPoint[]
  skill: ForecastSkill[]
  season: ForecastSeason
}

export type ClimateForecast = {
  latitude: number
  longitude: number
  lastObserved: string
  source: string
  series: ForecastSeries[]
}
