export type ClimateDay = {
  date: string
  label: string
  temperatureMean: number | null
  temperatureMax: number | null
  temperatureMin: number | null
  temperatureRange: [number, number] | null
  precipitation: number | null
  solarRadiation: number | null
  humidity: number | null
  soilWetness: number | null
}

export type ClimateSeries = {
  latitude: number
  longitude: number
  elevationMeters: number | null
  days: ClimateDay[]
}

export type ClimateSummary = {
  meanTemperature: number | null
  totalPrecipitation: number | null
  meanSoilWetness: number | null
  meanSolarRadiation: number | null
  coveredDays: number
}

function mean(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null)
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length
}

function sum(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null)
  return known.length === 0 ? null : known.reduce((total, value) => total + value, 0)
}

export function summarize(days: ClimateDay[]): ClimateSummary {
  return {
    meanTemperature: mean(days.map((day) => day.temperatureMean)),
    totalPrecipitation: sum(days.map((day) => day.precipitation)),
    meanSoilWetness: mean(days.map((day) => day.soilWetness)),
    meanSolarRadiation: mean(days.map((day) => day.solarRadiation)),
    coveredDays: days.length,
  }
}
