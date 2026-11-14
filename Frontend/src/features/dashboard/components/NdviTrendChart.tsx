import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
} from "recharts";
import { CHART_THEME, SERIES_COLORS } from "../model/chartTheme";
import type { NdviPoint } from "../model/demoData";
import { ChartTooltip } from "./ChartTooltip";
import { SeriesLegend } from "./SeriesLegend";

type NdviTrendChartProps = {
  fields: readonly string[];
  data: NdviPoint[];
};

function formatNdvi(value: number): string {
  return value.toFixed(2);
}

function endLabel(name: string, lastIndex: number) {
  return function EndLabel({ x, y, index }: LabelProps) {
    if (index !== lastIndex) {
      return null;
    }
    return (
      <text
        x={Number(x) + 8}
        y={Number(y)}
        dy={4}
        fontSize={12}
        fill="currentColor"
        className="fill-zinc-700 dark:fill-zinc-300"
      >
        {name}
      </text>
    );
  };
}

export function NdviTrendChart({ fields, data }: NdviTrendChartProps) {
  const lastIndex = data.length - 1;
  const legend = fields.map((name, index) => ({
    name,
    color: SERIES_COLORS[index],
  }));

  return (
    <div className="flex h-full flex-col gap-3">
      <SeriesLegend items={legend} />
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 88, bottom: 0, left: -16 }}
          >
            <CartesianGrid stroke={CHART_THEME.grid} vertical={false} />
            <XAxis
              dataKey="week"
              tick={CHART_THEME.tick}
              tickLine={false}
              axisLine={{ stroke: CHART_THEME.grid }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tick={CHART_THEME.tick}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              itemSorter={(item) => fields.indexOf(String(item.dataKey))}
              cursor={{ stroke: CHART_THEME.axis, strokeDasharray: "4 4" }}
              content={(props) => (
                <ChartTooltip {...props} formatValue={formatNdvi} />
              )}
            />
            {fields.map((field, index) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                name={field}
                stroke={SERIES_COLORS[index]}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: CHART_THEME.surface,
                }}
                label={endLabel(field, lastIndex)}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
