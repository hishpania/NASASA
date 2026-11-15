import type { ClimateDay } from './climate'
import type { ForecastPoint } from './forecast'

const DAY_MS = 86_400_000

export type TimelineRow = {
  time: number
  observed: number | null
  range: [number, number] | null
  normal: number | null
}

export type TimelineOptions = {
  value: (day: ClimateDay) => number | null
  range?: (day: ClimateDay) => [number, number] | null
  normals?: ForecastPoint[]
  perDay?: boolean
}

export type Timeline = {
  rows: TimelineRow[]
  ticks: number[]
}

function dayTime(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)))
}

function monthParts(month: string): [number, number] {
  const [year, monthNumber] = month.split('-').map(Number)
  return [year, monthNumber - 1]
}

function midMonth(month: string): number {
  const [year, index] = monthParts(month)
  return Date.UTC(year, index, 15)
}

function daysInMonth(month: string): number {
  const [year, index] = monthParts(month)
  return new Date(Date.UTC(year, index + 1, 0)).getUTCDate()
}

function emptyRow(time: number): TimelineRow {
  return { time, observed: null, range: null, normal: null }
}

function monthTicks(start: number, end: number): number[] {
  const ticks: number[] = []
  const first = new Date(start)
  let cursor = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1)
  while (cursor <= end) {
    ticks.push(cursor)
    const date = new Date(cursor)
    cursor = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  }
  return ticks
}

export function buildTimeline(days: ClimateDay[], options: TimelineOptions): Timeline {
  const rows = new Map<number, TimelineRow>()
  const rowAt = (time: number) => {
    const existing = rows.get(time)
    if (existing) {
      return existing
    }
    const row = emptyRow(time)
    rows.set(time, row)
    return row
  }

  const observed = days
    .map((day) => ({ time: dayTime(day.date), value: options.value(day), range: options.range?.(day) ?? null }))
    .filter((entry) => entry.value !== null)
  for (const entry of observed) {
    const row = rowAt(entry.time)
    row.observed = entry.value
    row.range = entry.range
  }

  const first = observed[0]?.time ?? null
  const last = observed.at(-1)?.time ?? null
  const scale = (point: ForecastPoint, value: number) => (options.perDay ? value / daysInMonth(point.month) : value)

  if (options.normals && first !== null && last !== null) {
    for (const point of options.normals) {
      const time = midMonth(point.month)
      if (time >= first && time <= last) {
        rowAt(time).normal = scale(point, point.normal)
      }
    }
  }

  const sorted = [...rows.values()].sort((a, b) => a.time - b.time)
  const start = sorted[0]?.time ?? 0
  const end = sorted.at(-1)?.time ?? 0
  return { rows: sorted, ticks: monthTicks(start - DAY_MS, end) }
}
