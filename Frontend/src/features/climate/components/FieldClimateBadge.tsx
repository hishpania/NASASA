import type { ClimateSnapshot } from '../model/snapshot'

type FieldClimateBadgeProps = {
  name: string
  areaHectares: number
  snapshot: ClimateSnapshot | undefined
  compact?: boolean
}

type Stat = {
  label: string
  value: number | null | undefined
  unit: string
  format: (value: number) => string
}

const areaFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export function FieldClimateBadge({ name, areaHectares, snapshot, compact = false }: FieldClimateBadgeProps) {
  if (compact) {
    const temperature = snapshot?.temperature
    return (
      <div className="flex max-w-36 items-baseline gap-2 text-sm/5">
        <span className="truncate font-semibold text-zinc-950 dark:text-white">{name}</span>
        {temperature != null && (
          <span className="shrink-0 text-zinc-600 tabular-nums dark:text-zinc-300">{temperature.toFixed(0)}°</span>
        )}
      </div>
    )
  }

  const stats: Stat[] = [
    { label: 'Air', value: snapshot?.temperature, unit: '°C', format: (value) => value.toFixed(1) },
    { label: 'Rain, 7 days', value: snapshot?.weeklyPrecipitation, unit: 'mm', format: (value) => value.toFixed(0) },
    {
      label: 'Soil moisture',
      value: snapshot?.soilWetness,
      unit: '%',
      format: (value) => String(Math.round(value * 100)),
    },
  ]

  return (
    <div className="w-72">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-base/6 font-semibold text-zinc-950 dark:text-white">{name}</span>
        <span className="shrink-0 text-sm/6 text-zinc-500 tabular-nums dark:text-zinc-400">
          {areaFormatter.format(areaHectares)} ha
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {stats.map(({ label, value, unit, format }) => (
          <div key={label} className="flex min-w-0 flex-col-reverse">
            <dt className="truncate text-xs/5 text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="flex items-baseline gap-0.5 text-zinc-950 tabular-nums dark:text-white">
              <span className="text-2xl/8 font-semibold">{value == null ? '–' : format(value)}</span>
              <span className="text-sm/6 text-zinc-500 dark:text-zinc-400">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
