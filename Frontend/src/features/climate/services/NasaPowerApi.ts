import type { LatLng } from '@/features/fields'
import type { ClimateDay, ClimateSeries } from '../model/climate'

const PARAMETERS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'ALLSKY_SFC_SW_DWN', 'RH2M', 'GWETROOT'] as const

type Parameter = (typeof PARAMETERS)[number]

type PowerResponse = {
  geometry: { coordinates: [number, number, number?] }
  header: { fill_value: number }
  properties: { parameter: Record<Parameter, Record<string, number>> }
}

type PowerErrorResponse = {
  messages?: string[]
  message?: string
}

const DAY_MS = 86_400_000

const labelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function toPowerDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}

function parsePowerDate(value: string): Date {
  return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8))))
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function hasMeasurements(day: ClimateDay): boolean {
  return day.temperatureMean !== null || day.precipitation !== null || day.soilWetness !== null
}

export class NasaPowerApi {
  private readonly baseUrl: string

  constructor(baseUrl = 'https://power.larc.nasa.gov') {
    this.baseUrl = baseUrl
  }

  async daily(point: LatLng, days: number, signal?: AbortSignal): Promise<ClimateSeries> {
    const end = new Date(Date.now() - DAY_MS)
    const start = new Date(end.getTime() - (days - 1) * DAY_MS)
    const query = new URLSearchParams({
      parameters: PARAMETERS.join(','),
      community: 'AG',
      latitude: point.lat.toFixed(4),
      longitude: point.lng.toFixed(4),
      start: toPowerDate(start),
      end: toPowerDate(end),
      format: 'JSON',
    })

    const response = await fetch(`${this.baseUrl}/api/temporal/daily/point?${query}`, { signal })
    if (!response.ok) {
      const problem = (await response.json().catch(() => null)) as PowerErrorResponse | null
      throw new Error(
        problem?.messages?.join(' ') ?? problem?.message ?? `NASA POWER responded with ${response.status}`,
      )
    }

    return NasaPowerApi.toSeries((await response.json()) as PowerResponse)
  }

  private static toSeries(response: PowerResponse): ClimateSeries {
    const fill = response.header.fill_value
    const parameters = response.properties.parameter
    const read = (parameter: Parameter, date: string, digits = 1): number | null => {
      const value = parameters[parameter]?.[date]
      return value === undefined || value === fill ? null : round(value, digits)
    }

    const days = Object.keys(parameters.T2M).map((date): ClimateDay => {
      const temperatureMax = read('T2M_MAX', date)
      const temperatureMin = read('T2M_MIN', date)
      return {
        date,
        label: labelFormatter.format(parsePowerDate(date)),
        temperatureMean: read('T2M', date),
        temperatureMax,
        temperatureMin,
        temperatureRange: temperatureMin !== null && temperatureMax !== null ? [temperatureMin, temperatureMax] : null,
        precipitation: read('PRECTOTCORR', date),
        solarRadiation: read('ALLSKY_SFC_SW_DWN', date),
        humidity: read('RH2M', date, 0),
        soilWetness: read('GWETROOT', date, 2),
      }
    })

    while (days.length > 0 && !hasMeasurements(days[days.length - 1])) {
      days.pop()
    }

    const [longitude, latitude, elevation] = response.geometry.coordinates
    return { latitude, longitude, elevationMeters: elevation ?? null, days }
  }
}

export const nasaPower = new NasaPowerApi()
