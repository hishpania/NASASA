import clsx from 'clsx'
import type { OutlookMonth, OutlookSeries, OutlookSeriesId } from '../model/outlook'

type Third = 'below' | 'near' | 'above'

const COOL = 'bg-blue-500 dark:bg-blue-400'
const WARM = 'bg-orange-500 dark:bg-orange-400'
const NEAR = 'bg-zinc-400 dark:bg-zinc-500'

const TONES: Record<OutlookSeriesId, Record<Third, string>> = {
  temperature: { below: COOL, near: NEAR, above: WARM },
  humidity: { below: WARM, near: NEAR, above: COOL },
  soil_wetness: { below: WARM, near: NEAR, above: COOL },
}

const THIRDS: Third[] = ['above', 'near', 'below']

const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

function monthDate(month: string): Date {
  const [year, index] = month.split('-').map(Number)
  return new Date(Date.UTC(year, index - 1, 1))
}

function formatValue(id: OutlookSeriesId, value: number): string {
  if (id === 'temperature') {
    return `${value.toFixed(1)} °C`
  }
  if (id === 'humidity') {
    return `${Math.round(value)} %`
  }
  return `${Math.round(value * 100)} %`
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`
}

function MonthBar({ series, month }: { series: OutlookSeries; month: OutlookMonth }) {
  const signal = month.confidence !== 'no signal'
  const tones = TONES[series.id]
  const date = monthDate(month.month)
  const labels: Record<Third, string> = {
    below: `${series.belowLabel} than ${formatValue(series.id, month.normalLow)}`,
    near: `near normal, ${formatValue(series.id, month.normalLow)} to ${formatValue(series.id, month.normalHigh)}`,
    above: `${series.aboveLabel} than ${formatValue(series.id, month.normalHigh)}`,
  }

  return (
    <li className="group relative flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className="h-4 truncate text-[10px]/4 text-zinc-500 sm:text-xs/4 dark:text-zinc-400">
        {signal ? month.confidence : '–'}
      </span>
      <div className={clsx('relative flex h-44 w-full flex-col overflow-hidden rounded-sm', !signal && 'opacity-25')}>
        {THIRDS.map((third) => (
          <div
            key={third}
            className={clsx(tones[third], 'flex items-center justify-center border-b border-white/70 last:border-0')}
            style={{ height: `${month[third] * 100}%` }}
          >
            {signal && month[third] >= 0.12 && (
              <span className="hidden text-[11px] font-medium text-white tabular-nums sm:block">
                {percent(month[third])}
              </span>
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dotted border-white/60" />
        <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dotted border-white/60" />
      </div>
      <span className="text-[10px]/4 text-zinc-500 sm:text-xs/4 dark:text-zinc-400">
        {monthName.format(date)}
        <span className="hidden sm:inline"> {String(date.getUTCFullYear()).slice(2)}</span>
      </span>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-60 -translate-x-1/2 rounded-lg bg-white p-3 text-xs/5 text-zinc-700 shadow-lg ring-1 ring-zinc-950/10 group-hover:block dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10">
        <p className="font-semibold text-zinc-950 dark:text-white">
          {monthName.format(date)} {date.getUTCFullYear()}
        </p>
        {signal ? (
          <>
            {THIRDS.map((third) => (
              <p key={third}>
                <span className="font-medium tabular-nums">{percent(month[third])}</span> {labels[third]}
              </p>
            ))}
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Confidence {month.confidence}: the likeliest third came true {percent(month.hitRate)} of the time in
              2010–2026 (33% by chance).
            </p>
          </>
        ) : (
          <p>No signal: this far ahead the model did not beat even odds in 2010–2026, so each third is 33%.</p>
        )}
      </div>
    </li>
  )
}

export function OutlookChart({ series }: { series: OutlookSeries }) {
  const tones = TONES[series.id]
  const legend: [string, string][] = [
    [tones.below, series.belowLabel],
    [tones.near, 'near normal'],
    [tones.above, series.aboveLabel],
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
        {legend.map(([tone, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={clsx('size-2.5 rounded-xs', tone)} />
            {label}
          </span>
        ))}
      </div>
      <ol className="mt-3 flex flex-1 items-end gap-1 sm:gap-2">
        {series.months.map((month) => (
          <MonthBar key={month.month} series={series} month={month} />
        ))}
      </ol>
    </div>
  )
}
