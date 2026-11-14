import { CHART_THEME, SERIES_COLORS } from "@/features/dashboard";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps, TooltipValueType } from "recharts";
import type { ClimateDay } from "../model/climate";

function formatCelsius(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} °C`;
}

function TemperatureTooltip({
  active,
  payload,
}: TooltipContentProps<TooltipValueType, string | number>) {
  const day = payload?.[0]?.payload as ClimateDay | undefined;
  if (!active || !day) {
    return null;
  }
  const rows = [
    { name: "Max", value: day.temperatureMax },
    { name: "Mean", value: day.temperatureMean },
    { name: "Min", value: day.temperatureMin },
  ];

  return (
    <div className="min-w-36 rounded-lg bg-white px-3 py-2 text-sm/6 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10">
      <p className="font-medium text-zinc-950 dark:text-white">{day.label}</p>
      <ul>
        {rows.map(({ name, value }) => (
          <li key={name} className="flex items-center justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400">{name}</span>
            <span className="font-medium text-zinc-950 tabular-nums dark:text-white">
              {formatCelsius(value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TemperatureChart({ days }: { days: ClimateDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
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
          unit="°"
        />
        <Tooltip
          cursor={{ stroke: CHART_THEME.axis, strokeDasharray: "3 3" }}
          content={TemperatureTooltip}
        />
        <Area
          dataKey="temperatureRange"
          name="Daily range"
          stroke="none"
          fill={SERIES_COLORS[1]}
          fillOpacity={0.2}
          isAnimationActive={false}
          activeDot={false}
        />
        <Line
          dataKey="temperatureMean"
          name="Mean"
          stroke={SERIES_COLORS[1]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: CHART_THEME.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
