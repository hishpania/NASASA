import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { Notice } from '@/components/ui/Notice'
import { ChartCard, SERIES_COLORS, StatTile } from '@/components/charts'
import { useFields } from '@/features/fields'
import { useMemo, useState, type ReactNode } from 'react'
import { useClimateData } from '../hooks/useClimateData'
import { useFieldForecast } from '../hooks/useFieldForecast'
import { summarize, type ClimateDay } from '../model/climate'
import { summarizeOutlook, type ClimateForecast, type ForecastSeries, type ForecastSeriesId } from '../model/forecast'
import { buildTimeline } from '../model/timeline'
import { NoFieldState } from '@/components/ui/NoFieldState'
import { SegmentedControl } from './SegmentedControl'
import { TimelineChart } from './TimelineChart'

const PERIODS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
] as const

type Period = (typeof PERIODS)[number]['value']

const FORECAST_MONTHS: Record<Period, number> = { 30: 3, 90: 6, 180: 12 }
const OUTLOOK_MONTHS = 3

const OUTLOOK_TITLES: Record<ForecastSeriesId, string> = {
  temperature: 'Temperature',
  precipitation: 'Precipitation',
  soil_wetness: 'Soil wetness',
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? '—' : value.toFixed(digits)
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 text-sm/6 text-zinc-500 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/10">
      {children}
    </div>
  )
}

function describeOutlook(series: ForecastSeries): { value: string; unit: string; hint: string } {
  const total = series.id === 'precipitation'
  const summary = summarizeOutlook(series, OUTLOOK_MONTHS, total)
  if (series.id === 'temperature') {
    const difference = summary.forecast - summary.normal
    return {
      value: summary.forecast.toFixed(1),
      unit: '°C',
      hint:
        Math.abs(difference) < 0.15
          ? 'Close to normal'
          : `${Math.abs(difference).toFixed(1)} °C ${difference > 0 ? 'warmer' : 'cooler'} than normal`,
    }
  }
  if (series.id === 'precipitation') {
    const share = summary.normal > 0 ? (summary.forecast - summary.normal) / summary.normal : 0
    return {
      value: String(Math.round(summary.forecast)),
      unit: 'mm',
      hint:
        Math.abs(share) < 0.03
          ? 'Close to normal'
          : `${Math.round(Math.abs(share) * 100)} % ${share > 0 ? 'wetter' : 'drier'} than normal`,
    }
  }
  const difference = Math.round((summary.forecast - summary.normal) * 100)
  return {
    value: String(Math.round(summary.forecast * 100)),
    unit: '%',
    hint:
      difference === 0
        ? 'Close to normal'
        : `${Math.abs(difference)} points ${difference > 0 ? 'wetter' : 'drier'} than normal`,
  }
}

function OutlookTiles({ forecast }: { forecast: ClimateForecast }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {forecast.series.map((series) => {
        const outlook = describeOutlook(series)
        return (
          <StatTile
            key={series.id}
            label={`${OUTLOOK_TITLES[series.id]}, next ${OUTLOOK_MONTHS} months`}
            value={outlook.value}
            unit={outlook.unit}
            hint={outlook.hint}
          />
        )
      })}
    </div>
  )
}

function SkillNote({ forecast }: { forecast: ClimateForecast }) {
  const parts = forecast.series.map((series) => {
    const modelMonths = series.skill.filter((entry) => entry.method === 'model').length
    return `${OUTLOOK_TITLES[series.id].toLowerCase()} ${modelMonths} of ${series.skill.length}`
  })
  return (
    <Text>
      The forecast is checked month by month on the last two years of data. Where the model beat the 25-year normal,
      its forecast is shown; elsewhere the normal is. Months answered by the model: {parts.join(', ')}.
    </Text>
  )
}

function seriesOf(forecast: ClimateForecast | null, id: ForecastSeriesId): ForecastSeries | undefined {
  return forecast?.series.find((series) => series.id === id)
}

export function ClimateView() {
  const { current, status } = useFields()
  const [period, setPeriod] = useState<Period>(90)

  const climate = useClimateData(current?.shape.center ?? null, period)
  const outlook = useFieldForecast(current?.id ?? null)
  const days = climate.status === 'loaded' ? climate.series.days : null
  const forecast = outlook.status === 'loaded' ? outlook.forecast : null
  const summary = days ? summarize(days) : null
  const forecastMonths = FORECAST_MONTHS[period]

  const timelines = useMemo(() => {
    if (!days) {
      return null
    }
    const daily = (value: (day: ClimateDay) => number | null) => buildTimeline(days, { value })
    return {
      temperature: buildTimeline(days, {
        value: (day) => day.temperatureMean,
        range: (day) => day.temperatureRange,
        forecast: seriesOf(forecast, 'temperature'),
        forecastMonths,
      }),
      precipitation: buildTimeline(days, {
        value: (day) => day.precipitation,
        forecast: seriesOf(forecast, 'precipitation'),
        forecastMonths,
        perDay: true,
      }),
      soilWetness: buildTimeline(days, {
        value: (day) => day.soilWetness,
        forecast: seriesOf(forecast, 'soil_wetness'),
        forecastMonths,
      }),
      solarRadiation: daily((day) => day.solarRadiation),
      humidity: daily((day) => day.humidity),
    }
  }, [days, forecast, forecastMonths])

  if (status === 'loading') {
    return <Placeholder>Loading your fields…</Placeholder>
  }

  if (current === null) {
    return (
      <NoFieldState
        title="Add a field to see its climate"
        description="Outline your field on the map and we will show its temperature, rain and soil moisture from NASA POWER, with a forecast for the months ahead."
      />
    )
  }

  const forecastNote =
    outlook.status === 'failed'
      ? ` The forecast is unavailable: ${outlook.message}`
      : outlook.status === 'loaded'
        ? ` After the dashed line comes the forecast for the next ${forecastMonths} months.`
        : ' The forecast is being trained on 25 years of monthly data…'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Text>
          Daily data from{' '}
          <Link href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">
            NASA POWER
          </Link>{' '}
          for {current.name}. The newest days can lag by a few days.{forecastNote}
        </Text>
        <SegmentedControl label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {climate.status === 'failed' && <Notice>Could not load NASA POWER data: {climate.message}</Notice>}

      {(climate.status === 'loading' || climate.status === 'idle') && (
        <Placeholder>Loading NASA POWER data…</Placeholder>
      )}

      {timelines && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Mean temperature"
              value={formatNumber(summary.meanTemperature, 1)}
              unit="°C"
              hint={`${summary.coveredDays} days of data`}
            />
            <StatTile
              label="Total precipitation"
              value={formatNumber(summary.totalPrecipitation, 0)}
              unit="mm"
              hint="Bias-corrected"
            />
            <StatTile
              label="Root zone soil wetness"
              value={summary.meanSoilWetness === null ? '—' : String(Math.round(summary.meanSoilWetness * 100))}
              unit="%"
              hint="0 % is dry, 100 % is saturated"
            />
            <StatTile
              label="Solar radiation"
              value={formatNumber(summary.meanSolarRadiation, 1)}
              unit="MJ/m²/day"
              hint="Daily average, all sky"
            />
          </div>

          {forecast && <OutlookTiles forecast={forecast} />}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Air temperature"
              description="Daily mean at 2 m with the daily min–max band, then the monthly forecast. The dotted line is the 25-year normal."
              className="xl:col-span-2"
            >
              <TimelineChart
                timeline={timelines.temperature}
                name="Mean"
                formatValue={(value) => `${value.toFixed(1)} °C`}
                formatTick={(value) => `${value}°`}
              />
            </ChartCard>
            <ChartCard
              title="Precipitation"
              description="Daily precipitation, bias-corrected, then the forecast as the average per day of each month."
            >
              <TimelineChart
                timeline={timelines.precipitation}
                name="Precipitation"
                kind="bar"
                color={SERIES_COLORS[0]}
                domain={[0, 'auto']}
                formatValue={(value) => `${value.toFixed(1)} mm/day`}
              />
            </ChartCard>
            <ChartCard
              title="Root zone soil wetness"
              description="Share of soil pores filled with water, 0 to 100 %. Moisture carries over, so the first forecast months are the most reliable."
            >
              <TimelineChart
                timeline={timelines.soilWetness}
                name="Soil wetness"
                color={SERIES_COLORS[2]}
                domain={[0, 1]}
                formatValue={(value) => `${Math.round(value * 100)} %`}
                formatTick={(value) => `${Math.round(value * 100)}%`}
              />
            </ChartCard>
            <ChartCard
              title="Solar radiation"
              description="All-sky shortwave irradiance at the surface, MJ/m² per day."
            >
              <TimelineChart
                timeline={timelines.solarRadiation}
                name="Solar radiation"
                color={SERIES_COLORS[1]}
                formatValue={(value) => `${value.toFixed(1)} MJ/m²`}
              />
            </ChartCard>
            <ChartCard title="Relative humidity" description="Daily mean at 2 m above the surface.">
              <TimelineChart
                timeline={timelines.humidity}
                name="Humidity"
                color={SERIES_COLORS[0]}
                domain={[0, 100]}
                formatValue={(value) => `${Math.round(value)} %`}
              />
            </ChartCard>
          </div>

          {forecast && <SkillNote forecast={forecast} />}
        </>
      )}
    </div>
  )
}
