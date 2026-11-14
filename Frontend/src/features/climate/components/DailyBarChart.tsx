import { CHART_THEME, ChartTooltip, SERIES_COLORS } from "@/features/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClimateDay } from "../model/climate";

type DailyBarChartProps = {
  days: ClimateDay[];
  dataKey: keyof ClimateDay;
  name: string;
  formatValue: (value: number) => string;
};

export function DailyBarChart({
  days,
  dataKey,
  name,
  formatValue,
}: DailyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={days}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        barCategoryGap={1}
      >
        <CartesianGrid stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={CHART_THEME.tick}
          tickLine={false}
          axisLine={{ stroke: CHART_THEME.grid }}
          minTickGap={24}
        />
        <YAxis tick={CHART_THEME.tick} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: CHART_THEME.cursor }}
          content={(props) => (
            <ChartTooltip {...props} formatValue={formatValue} />
          )}
        />
        <Bar
          dataKey={dataKey}
          name={name}
          fill={SERIES_COLORS[0]}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
