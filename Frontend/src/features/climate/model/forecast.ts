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

export type ForecastSeriesId = 'temperature' | 'precipitation' | 'soil_wetness'

export type ForecastSeries = {
  id: ForecastSeriesId
  name: string
  unit: string
  history: ForecastPoint[]
  forecast: ForecastPoint[]
  skill: ForecastSkill[]
}

export type ClimateForecast = {
  latitude: number
  longitude: number
  lastObserved: string
  source: string
  series: ForecastSeries[]
}

export type OutlookSummary = {
  months: number
  forecast: number
  normal: number
  modelMonths: number
}

export function summarizeOutlook(series: ForecastSeries, months: number, total: boolean): OutlookSummary {
  const window = series.forecast.slice(0, months)
  const combine = (values: number[]) => {
    const sum = values.reduce((acc, value) => acc + value, 0)
    return total ? sum : sum / values.length
  }
  return {
    months: window.length,
    forecast: combine(window.map((point) => point.value)),
    normal: combine(window.map((point) => point.normal)),
    modelMonths: series.skill.filter((entry) => entry.method === 'model').length,
  }
}
