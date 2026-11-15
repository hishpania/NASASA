import { formatMonthDay, MONTH_INITIALS, yearFraction, yearSpans, type SowingDates } from '../model/advice'

type SeasonBarProps = {
  sowing: SowingDates
}

const percent = (fraction: number) => `${fraction * 100}%`

/** A year at a glance: when to sow, how long the crop stands, when it is ready. */
export function SeasonBar({ sowing }: SeasonBarProps) {
  const start = yearFraction(sowing.start)
  const end = yearFraction(sowing.end)
  const maturity = yearFraction(sowing.maturity)
  const label = `Sow ${formatMonthDay(sowing.start)} to ${formatMonthDay(sowing.end)}, harvest around ${formatMonthDay(sowing.maturity)}`

  return (
    <figure className="space-y-1.5" aria-label={label}>
      <div className="relative h-3 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
        {yearSpans(end, maturity).map(([from, to]) => (
          <div
            key={`grow-${from}`}
            className="absolute inset-y-0 bg-zinc-950/15 dark:bg-white/20"
            style={{ left: percent(from), width: percent(to - from) }}
          />
        ))}
        {yearSpans(start, end).map(([from, to]) => (
          <div
            key={`sow-${from}`}
            className="absolute inset-y-0 min-w-1 rounded-full bg-emerald-600 dark:bg-emerald-500"
            style={{ left: percent(from), width: percent(to - from) }}
          />
        ))}
        <div
          className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-amber-500"
          style={{ left: percent(maturity) }}
        />
      </div>
      <div aria-hidden="true" className="grid grid-cols-12 text-center text-[10px]/3 text-zinc-400 dark:text-zinc-500">
        {MONTH_INITIALS.map((initial, month) => (
          <span key={month}>{initial}</span>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-x-3 text-xs/5 text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
          Sow {formatMonthDay(sowing.start)} – {formatMonthDay(sowing.end)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          Harvest ~{formatMonthDay(sowing.maturity)}
        </span>
      </figcaption>
    </figure>
  )
}
