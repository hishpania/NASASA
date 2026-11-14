import type { ClimateDay } from './climate'

export type ClimateSnapshot = {
  date: string
  temperature: number | null
  weeklyPrecipitation: number | null
  soilWetness: number | null
}

const WEEK = 7

function latest(days: ClimateDay[], read: (day: ClimateDay) => number | null): number | null {
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const value = read(days[index])
    if (value !== null) {
      return value
    }
  }
  return null
}

export function toSnapshot(days: ClimateDay[]): ClimateSnapshot | null {
  if (days.length === 0) {
    return null
  }
  const week = days
    .slice(-WEEK)
    .map((day) => day.precipitation)
    .filter((value): value is number => value !== null)

  return {
    date: days[days.length - 1].label,
    temperature: latest(days, (day) => day.temperatureMean),
    weeklyPrecipitation: week.length === 0 ? null : Math.round(week.reduce((sum, value) => sum + value, 0) * 10) / 10,
    soilWetness: latest(days, (day) => day.soilWetness),
  }
}
