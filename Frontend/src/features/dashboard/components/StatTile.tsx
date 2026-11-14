import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'

const deltaFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

type StatTileProps = {
  label: string
  value: string
  unit?: string
  delta?: number
  hint?: string
}

export function StatTile({ label, value, unit, delta, hint }: StatTileProps) {
  const isFlat = delta === undefined || Math.abs(delta) < 0.05
  const isUp = delta !== undefined && delta > 0

  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl/9 font-semibold text-zinc-950 tabular-nums dark:text-white">{value}</span>
        {unit && <span className="text-sm/6 text-zinc-500 dark:text-zinc-400">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {delta !== undefined && (
        <p
          className={clsx(
            'mt-2 flex items-center gap-1 text-sm/6 tabular-nums',
            isFlat
              ? 'text-zinc-500 dark:text-zinc-400'
              : isUp
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400',
          )}
        >
          {!isFlat &&
            (isUp ? (
              <ArrowUpIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownIcon className="size-3.5" aria-hidden="true" />
            ))}
          {isFlat ? 'No change' : `${deltaFormatter.format(delta)}%`}
          <span className="text-zinc-500 dark:text-zinc-400">vs previous</span>
        </p>
      )}
    </div>
  )
}
