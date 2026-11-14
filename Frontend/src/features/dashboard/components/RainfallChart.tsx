import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_THEME, SERIES_COLORS } from '../model/chartTheme'
import type { RainfallPoint } from '../model/demoData'
import { ChartTooltip } from './ChartTooltip'

function formatMillimeters(value: number): string {
  return `${value} mm`
}

export function RainfallChart({ data }: { data: RainfallPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap={4}>
        <CartesianGrid stroke={CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="month" tick={CHART_THEME.tick} tickLine={false} axisLine={{ stroke: CHART_THEME.grid }} />
        <YAxis tick={CHART_THEME.tick} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: CHART_THEME.cursor }}
          content={(props) => <ChartTooltip {...props} formatValue={formatMillimeters} />}
        />
        <Bar
          dataKey="millimeters"
          name="Rainfall"
          fill={SERIES_COLORS[0]}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
