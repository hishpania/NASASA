import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { Notice } from '@/components/ui/Notice'
import { ChartCard, SERIES_COLORS, StatTile } from '@/components/charts'
import { useFields } from '@/features/fields'
import { useMemo, useState, type ReactNode } from 'react'
import { useClimateData } from '../hooks/useClimateData'
import { useFieldForecast } from '../hooks/useFieldForecast'
import { useFieldOutlook } from '../hooks/useFieldOutlook'
import { summarize } from '../model/climate'
import type { ClimateForecast, ForecastSeriesId } from '../model/forecast'
import type { OutlookSeriesId } from '../model/outlook'
import { buildTimeline } from '../model/timeline'
import { NoFieldState } from '@/components/ui/NoFieldState'
import { OutlookChart } from './OutlookChart'
import { OutlookPreparing } from './OutlookPreparing'
import { SegmentedControl } from './SegmentedControl'
import { TimelineChart } from './TimelineChart'

const PERIODS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
] as const

type Period = (typeof PERIODS)[number]['value']

const OUTLOOK_DESCRIPTIONS: Record<OutlookSeriesId, string> = {
  temperature: 'Monthly mean air temperature at 2 m.',
  humidity: 'Monthly mean relative humidity at 2 m.',
  soil_wetness: 'Monthly mean share of root zone soil pores filled with water.',
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

function normalsOf(forecast: ClimateForecast | null, id: ForecastSeriesId) {
  return forecast?.series.find((series) => series.id === id)?.history
}

export function ClimateView() {
  const { current, status } = useFields()
  const [period, setPeriod] = useState<Period>(90)

  const climate = useClimateData(current?.shape.center ?? null, period)
  const outlook = useFieldForecast(current?.id ?? null)
  const monthly = useFieldOutlook(current?.id ?? null)
  const days = climate.status === 'loaded' ? climate.series.days : null
  const forecast = outlook.status === 'loaded' ? outlook.forecast : null
  const summary = days ? summarize(days) : null

  const timelines = useMemo(() => {
    if (!days) {
      return null
    }
    return {
      precipitation: buildTimeline(days, {
        value: (day) => day.precipitation,
        normals: normalsOf(forecast, 'precipitation'),
        perDay: true,
      }),
      solarRadiation: buildTimeline(days, { value: (day) => day.solarRadiation }),
    }
  }, [days, forecast])

  if (status === 'loading') {
    return <Placeholder>Loading your fields…</Placeholder>
  }

  if (current === null) {
    return (
      <NoFieldState
        title="Add a field to see its climate"
        description="Outline your field on the map and we will show its temperature, rain and soil moisture from NASA POWER, with the odds for the season ahead."
      />
    )
  }

  const forecastNote =
    outlook.status === 'failed'
      ? ` The forecast is unavailable: ${outlook.message}`
      : outlook.status === 'loaded'
        ? ' The dotted line on the precipitation chart is the 25-year normal.'
        : ''

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

          <section className="space-y-3">
            <div>
              <h2 className="text-base/7 font-semibold text-zinc-950 dark:text-white">Next 12 months</h2>
              <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
                Chances that each month lands in the lower, middle or upper third of its history since 1981. The label
                above a bar is the confidence from the 2010–2026 track record; faded bars have no signal.
              </p>
            </div>
            {monthly.status === 'failed' && <Notice>The 12-month outlook is unavailable: {monthly.message}</Notice>}
            {(monthly.status === 'loading' || monthly.status === 'idle' || monthly.status === 'preparing') && (
              <OutlookPreparing startedAt={monthly.status === 'preparing' ? monthly.startedAt : null} />
            )}
            {monthly.status === 'loaded' &&
              monthly.series.map((series) => (
                <ChartCard key={series.id} title={series.name} description={OUTLOOK_DESCRIPTIONS[series.id]}>
                  <OutlookChart series={series} />
                </ChartCard>
              ))}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Precipitation"
              description="Daily precipitation, bias-corrected. The dotted line is the normal per day of each month."
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
          </div>
        </>
      )}
    </div>
  )
}
