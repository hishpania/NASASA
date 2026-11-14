import type { ClimateSnapshot } from '../model/snapshot'

type FieldClimateBadgeProps = {
  name: string
  areaHectares: number
  snapshot: ClimateSnapshot | undefined
}

const areaFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

function formatValue(value: number | null | undefined, format: (value: number) => string): string {
  return value === null || value === undefined ? '…' : format(value)
}

export function FieldClimateBadge({ name, areaHectares, snapshot }: FieldClimateBadgeProps) {
  const stats = [
    { label: 'Temp', value: formatValue(snapshot?.temperature, (value) => `${value.toFixed(1)}°`) },
    { label: 'Rain 7d', value: formatValue(snapshot?.weeklyPrecipitation, (value) => `${value.toFixed(0)} mm`) },
    { label: 'Soil', value: formatValue(snapshot?.soilWetness, (value) => `${Math.round(value * 100)}%`) },
  ]

  return (
    <div className="min-w-40 text-xs/5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-semibold text-zinc-950 dark:text-white">{name}</span>
        <span className="shrink-0 text-zinc-500 tabular-nums dark:text-zinc-400">
          {areaFormatter.format(areaHectares)} ha
        </span>
      </div>
      <dl className="mt-1 grid grid-cols-3 gap-2 border-t border-zinc-950/5 pt-1 dark:border-white/10">
        {stats.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[10px]/4 text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="font-medium text-zinc-950 tabular-nums dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
      {snapshot && <p className="mt-1 text-[10px]/4 text-zinc-400">NASA POWER · {snapshot.date}</p>}
    </div>
  )
}
