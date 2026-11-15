import clsx from 'clsx'
import { formatShare } from '../model/advice'

type ScoreMeterProps = {
  label: string
  value: number
  hint?: string
  emphasized?: boolean
}

export function ScoreMeter({ label, value, hint, emphasized = false }: ScoreMeterProps) {
  return (
    <div title={hint}>
      <div className="flex items-baseline justify-between gap-2 text-xs/5">
        <span
          className={clsx(
            emphasized ? 'font-semibold text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400',
          )}
        >
          {label}
        </span>
        <span className="text-zinc-950 tabular-nums dark:text-white">{formatShare(value)}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10"
      >
        <div
          className={clsx('h-full rounded-full', emphasized ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500')}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  )
}
