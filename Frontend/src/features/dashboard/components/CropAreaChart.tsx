import { formatHectares } from '@/lib/format'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_THEME, SERIES_COLORS } from '../model/chartTheme'
import type { CropArea } from '../model/demoData'
import { ChartTooltip } from './ChartTooltip'

export function CropAreaChart({ data }: { data: CropArea[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 8 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="crop" tick={CHART_THEME.tick} tickLine={false} axisLine={false} width={80} />
        <Tooltip
          cursor={{ fill: CHART_THEME.cursor }}
          content={(props) => <ChartTooltip {...props} formatValue={formatHectares} />}
        />
        <Bar dataKey="hectares" name="Area" fill={SERIES_COLORS[0]} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="hectares"
            position="right"
            formatter={(value) => formatHectares(Number(value))}
            className="fill-zinc-700 text-xs tabular-nums dark:fill-zinc-300"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
