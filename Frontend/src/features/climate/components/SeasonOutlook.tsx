import clsx from 'clsx'
import type { ClimateForecast, ForecastSeason, ForecastSeries, ForecastSeriesId } from '../model/forecast'

type Outcome = { label: string; share: number; tone: string; text: string }

const WORDS: Record<ForecastSeriesId, { title: string; below: string; above: string }> = {
  temperature: { title: 'Temperature', below: 'Cooler', above: 'Warmer' },
  precipitation: { title: 'Precipitation', below: 'Drier', above: 'Wetter' },
  soil_wetness: { title: 'Soil wetness', below: 'Drier', above: 'Wetter' },
}

const TONES: Record<ForecastSeriesId, { below: [string, string]; above: [string, string] }> = {
  temperature: {
    below: ['bg-sky-500', 'text-sky-700 dark:text-sky-400'],
    above: ['bg-rose-500', 'text-rose-700 dark:text-rose-400'],
  },
  precipitation: {
    below: ['bg-amber-500', 'text-amber-700 dark:text-amber-400'],
    above: ['bg-sky-500', 'text-sky-700 dark:text-sky-400'],
  },
  soil_wetness: {
    below: ['bg-amber-500', 'text-amber-700 dark:text-amber-400'],
    above: ['bg-sky-500', 'text-sky-700 dark:text-sky-400'],
  },
}

const NEAR_TONE: [string, string] = ['bg-zinc-400 dark:bg-zinc-500', 'text-zinc-700 dark:text-zinc-300']

const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

function formatMonth(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return monthName.format(new Date(Date.UTC(year, index - 1, 1)))
}

function formatRange(id: ForecastSeriesId, season: ForecastSeason): string {
  if (id === 'temperature') {
    return `${season.lower.toFixed(1)} to ${season.upper.toFixed(1)} °C on average`
  }
  if (id === 'precipitation') {
    return `${Math.round(season.lower)} to ${Math.round(season.upper)} mm in total`
  }
  return `${Math.round(season.lower * 100)} to ${Math.round(season.upper * 100)} % on average`
}

function outcomesOf(series: ForecastSeries): Outcome[] {
  const words = WORDS[series.id]
  const tones = TONES[series.id]
  const { below, near, above } = series.season
  return [
    { label: words.below, share: below, tone: tones.below[0], text: tones.below[1] },
    { label: 'Normal', share: near, tone: NEAR_TONE[0], text: NEAR_TONE[1] },
    { label: words.above, share: above, tone: tones.above[0], text: tones.above[1] },
  ]
}

function headline(series: ForecastSeries, outcomes: Outcome[]): string {
  if (series.season.method === 'normal') {
    return 'No clear signal'
  }
  const [first, second] = [...outcomes].sort((a, b) => b.share - a.share)
  if (first.share - second.share < 5) {
    return 'No clear signal'
  }
  return first.label === 'Normal' ? 'Likely normal' : `Leaning ${first.label.toLowerCase()}`
}

function SeasonTile({ series }: { series: ForecastSeries }) {
  const outcomes = outcomesOf(series)
  const top = Math.max(...outcomes.map((outcome) => outcome.share))

  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">{WORDS[series.id].title}</p>
      <p className="mt-1 text-xl/8 font-semibold text-zinc-950 dark:text-white">{headline(series, outcomes)}</p>
      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {outcomes.map((outcome) => (
          <div
            key={outcome.label}
            className={clsx(outcome.tone, outcome.share !== top && 'opacity-40')}
            style={{ width: `${outcome.share}%` }}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {outcomes.map((outcome) => (
          <div key={outcome.label}>
            <dt className="text-xs/5 text-zinc-500 dark:text-zinc-400">{outcome.label}</dt>
            <dd
              className={clsx(
                'text-lg/7 font-semibold tabular-nums',
                outcome.share === top ? outcome.text : 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              {outcome.share}%
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-zinc-950/5 pt-3 text-xs/5 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        Normal here is {formatRange(series.id, series.season)}
      </p>
    </div>
  )
}

export function SeasonOutlook({ forecast }: { forecast: ClimateForecast }) {
  const season = forecast.series[0]?.season
  if (!season) {
    return null
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base/7 font-semibold text-zinc-950 dark:text-white">
          Next 3 months, {formatMonth(season.start)} to {formatMonth(season.end)}
        </h2>
        <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
          Chances that the season lands in the lower, middle or upper third of the last 25 years.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {forecast.series.map((series) => (
          <SeasonTile key={series.id} series={series} />
        ))}
      </div>
    </section>
  )
}
