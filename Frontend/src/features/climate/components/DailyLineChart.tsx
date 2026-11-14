import { CHART_THEME, ChartTooltip, SERIES_COLORS } from "@/features/dashboard";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClimateDay } from "../model/climate";

type DailyLineChartProps = {
  days: ClimateDay[];
  dataKey: keyof ClimateDay;
  name: string;
  color?: string;
  domain?: [number, number];
  formatValue: (value: number) => string;
  formatTick?: (value: number) => string;
};

export function DailyLineChart({
  days,
  dataKey,
  name,
  color = SERIES_COLORS[2],
  domain,
  formatValue,
  formatTick,
}: DailyLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={days}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
      >
        <CartesianGrid stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={CHART_THEME.tick}
          tickLine={false}
          axisLine={{ stroke: CHART_THEME.grid }}
          minTickGap={24}
        />
        <YAxis
          tick={CHART_THEME.tick}
          tickLine={false}
          axisLine={false}
          domain={domain ?? ["auto", "auto"]}
          tickFormatter={formatTick}
        />
        <Tooltip
          cursor={{ stroke: CHART_THEME.axis, strokeDasharray: "3 3" }}
          content={(props) => (
            <ChartTooltip {...props} formatValue={formatValue} />
          )}
        />
        <Line
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: CHART_THEME.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
