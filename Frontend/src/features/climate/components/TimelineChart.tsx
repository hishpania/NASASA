import { CHART_THEME, SERIES_COLORS } from '@/components/charts'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps, TooltipValueType } from 'recharts'
import type { Timeline, TimelineRow } from '../model/timeline'

type TimelineChartProps = {
  timeline: Timeline
  name: string
  kind?: 'line' | 'bar'
  color?: string
  domain?: [number | 'auto', number | 'auto']
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
}

const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const tickFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

function formatTickDate(time: number): string {
  const date = new Date(time)
  return date.getUTCMonth() === 0 ? `${tickFormatter.format(date)} ’${String(date.getUTCFullYear()).slice(2)}` : tickFormatter.format(date)
}

function makeTooltip(name: string, lastObserved: number | null, formatValue: (value: number) => string) {
  return function TimelineTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
    const row = payload?.[0]?.payload as TimelineRow | undefined
    if (!active || !row) {
      return null
    }
    const isForecast = lastObserved !== null && row.time > lastObserved
    const entries: { label: string; text: string }[] = []
    if (!isForecast && row.observed !== null) {
      entries.push({ label: name, text: formatValue(row.observed) })
      if (row.range) {
        entries.push({ label: 'Min – max', text: `${formatValue(row.range[0])} – ${formatValue(row.range[1])}` })
      }
    }
    if (isForecast && row.forecast !== null) {
      entries.push({ label: 'Forecast', text: formatValue(row.forecast) })
      if (row.band) {
        entries.push({ label: 'Likely range', text: `${formatValue(row.band[0])} – ${formatValue(row.band[1])}` })
      }
    }
    if (row.normal !== null) {
      entries.push({ label: 'Normal', text: formatValue(row.normal) })
    }
    if (entries.length === 0) {
      return null
    }
    const date = new Date(row.time)

    return (
      <div className="min-w-44 rounded-lg bg-white px-3 py-2 text-sm/6 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
        <p className="font-medium text-zinc-950 dark:text-white">
          {isForecast || row.observed === null ? monthFormatter.format(date) : dayFormatter.format(date)}
        </p>
        <ul>
          {entries.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400">{entry.label}</span>
              <span className="font-medium text-zinc-950 tabular-nums dark:text-white">{entry.text}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

export function TimelineChart({
  timeline,
  name,
  kind = 'line',
  color = SERIES_COLORS[1],
  domain = ['auto', 'auto'],
  formatValue,
  formatTick,
}: TimelineChartProps) {
  const { rows, lastObserved, ticks } = timeline
  const hasForecast = rows.some((row) => row.forecast !== null)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={ticks}
          tickFormatter={formatTickDate}
          tick={CHART_THEME.tick}
          tickLine={false}
          axisLine={{ stroke: CHART_THEME.grid }}
        />
        <YAxis
          tick={CHART_THEME.tick}
          tickLine={false}
          axisLine={false}
          domain={domain}
          tickFormatter={formatTick}
          width={56}
        />
        <Tooltip
          cursor={{ stroke: CHART_THEME.axis, strokeDasharray: '3 3' }}
          content={makeTooltip(name, lastObserved, formatValue)}
        />
        {hasForecast && lastObserved !== null && (
          <ReferenceLine
            x={lastObserved}
            stroke={CHART_THEME.axis}
            strokeDasharray="4 4"
            label={{ value: 'Forecast →', position: 'insideTopLeft', fill: CHART_THEME.axis, fontSize: 12 }}
          />
        )}
        <Area
          dataKey="range"
          stroke="none"
          fill={color}
          fillOpacity={0.2}
          isAnimationActive={false}
          activeDot={false}
          connectNulls
        />
        <Area
          dataKey="band"
          stroke="none"
          fill={color}
          fillOpacity={0.15}
          isAnimationActive={false}
          activeDot={false}
          connectNulls
        />
        <Line
          dataKey="normal"
          stroke={CHART_THEME.axis}
          strokeWidth={1}
          strokeDasharray="2 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          connectNulls
        />
        {kind === 'bar' ? (
          <Bar dataKey="observed" fill={color} barSize={3} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        ) : (
          <Line
            dataKey="observed"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: CHART_THEME.surface, strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls
          />
        )}
        <Line
          dataKey="forecast"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4, stroke: CHART_THEME.surface, strokeWidth: 2 }}
          isAnimationActive={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
