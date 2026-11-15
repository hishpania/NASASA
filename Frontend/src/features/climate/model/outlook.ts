export type OutlookConfidence = 'high' | 'moderate' | 'low' | 'no signal'

export type OutlookMonth = {
  month: string
  lead: number
  below: number
  near: number
  above: number
  normalLow: number
  normalHigh: number
  confidence: OutlookConfidence
  skill: number
  hitRate: number
}

export type OutlookSeriesId = 'temperature' | 'humidity' | 'soil_wetness'

export type OutlookSeries = {
  id: OutlookSeriesId
  name: string
  units: string
  belowLabel: string
  aboveLabel: string
  months: OutlookMonth[]
}

export type MonthlyOutlook =
  | { status: 'preparing'; startedAt: string; forecastDate: null; series: [] }
  | { status: 'ready'; forecastDate: string; series: OutlookSeries[] }
