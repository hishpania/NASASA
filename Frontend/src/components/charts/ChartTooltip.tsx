import type { TooltipContentProps, TooltipValueType } from 'recharts'

type ChartTooltipProps = TooltipContentProps<TooltipValueType, string | number> & {
  formatValue?: (value: number) => string
}

export function ChartTooltip({ active, payload, label, formatValue = String }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="min-w-36 rounded-lg bg-white px-3 py-2 text-sm/6 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{label}</p>
      <ul>
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
              {entry.name}
            </span>
            <span className="font-medium text-zinc-950 tabular-nums dark:text-white">
              {formatValue(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
