import { Link } from "@/components/catalyst/link";
import { Text } from "@/components/catalyst/text";
import { ChartCard, SERIES_COLORS, StatTile } from "@/features/dashboard";
import { fieldApi, type Field, type LatLng } from "@/features/fields";
import { useEffect, useMemo, useState } from "react";
import { useClimateData } from "../hooks/useClimateData";
import { summarize } from "../model/climate";
import { DailyBarChart } from "./DailyBarChart";
import { DailyLineChart } from "./DailyLineChart";
import { SegmentedControl } from "./SegmentedControl";
import { TemperatureChart } from "./TemperatureChart";

type Location = { id: string; name: string; point: LatLng };

const SAMPLE_LOCATION: Location = {
  id: "sample",
  name: "Sample: Kansas, USA",
  point: { lat: 38.5, lng: -98 },
};

const PERIODS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

const coordinateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

function toLocation(field: Field): Location {
  return { id: field.id, name: field.name, point: field.shape.center };
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? "—" : value.toFixed(digits);
}

export function ClimateView() {
  const [fields, setFields] = useState<Location[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(90);

  useEffect(() => {
    const controller = new AbortController();
    fieldApi
      .list(controller.signal)
      .then((list) => setFields(list.map(toLocation)))
      .catch(() => {
        if (!controller.signal.aborted) {
          setFields([]);
        }
      });
    return () => controller.abort();
  }, []);

  const locations = useMemo(
    () => (fields && fields.length > 0 ? fields : [SAMPLE_LOCATION]),
    [fields],
  );
  const location =
    locations.find((candidate) => candidate.id === selectedId) ?? locations[0];
  const climate = useClimateData(fields ? location.point : null, period);
  const series = climate.status === "loaded" ? climate.series : null;
  const summary = series ? summarize(series.days) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          label="Location"
          options={locations.map(({ id, name }) => ({
            value: id,
            label: name,
          }))}
          value={location.id}
          onChange={setSelectedId}
        />
        <SegmentedControl
          label="Period"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <Text>
        Daily agro-climate data from{" "}
        <Link
          href="https://power.larc.nasa.gov/"
          target="_blank"
          rel="noreferrer"
        >
          NASA POWER
        </Link>{" "}
        for {location.name} at {coordinateFormatter.format(location.point.lat)},{" "}
        {coordinateFormatter.format(location.point.lng)}
        {series?.elevationMeters != null &&
          `, ${Math.round(series.elevationMeters)} m elevation`}
        . The newest days can lag by a few days.
      </Text>

      {climate.status === "failed" && (
        <div className="rounded-lg bg-red-50 p-3 text-sm/6 text-red-800 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20">
          Could not load NASA POWER data: {climate.message}
        </div>
      )}

      {(climate.status === "loading" || climate.status === "idle") && (
        <div className="rounded-xl bg-white p-6 text-sm/6 text-zinc-500 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/10">
          Loading NASA POWER data…
        </div>
      )}

      {series && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Mean temperature"
              value={formatNumber(summary.meanTemperature, 1)}
              unit="°C"
              hint={`${summary.coveredDays} days of data`}
            />
            <StatTile
              label="Total precipitation"
              value={formatNumber(summary.totalPrecipitation, 0)}
              unit="mm"
              hint="Bias-corrected"
            />
            <StatTile
              label="Root zone soil wetness"
              value={
                summary.meanSoilWetness === null
                  ? "—"
                  : String(Math.round(summary.meanSoilWetness * 100))
              }
              unit="%"
              hint="0 % is dry, 100 % is saturated"
            />
            <StatTile
              label="Solar radiation"
              value={formatNumber(summary.meanSolarRadiation, 1)}
              unit="MJ/m²/day"
              hint="Daily average, all sky"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Air temperature"
              description="Daily mean at 2 m, the band spans the daily minimum and maximum."
              className="xl:col-span-2"
            >
              <TemperatureChart days={series.days} />
            </ChartCard>
            <ChartCard
              title="Precipitation"
              description="Daily precipitation, bias-corrected, in millimeters."
            >
              <DailyBarChart
                days={series.days}
                dataKey="precipitation"
                name="Precipitation"
                formatValue={(value) => `${value.toFixed(1)} mm`}
              />
            </ChartCard>
            <ChartCard
              title="Root zone soil wetness"
              description="Share of soil pores filled with water, 0 to 100 %."
            >
              <DailyLineChart
                days={series.days}
                dataKey="soilWetness"
                name="Soil wetness"
                domain={[0, 1]}
                formatValue={(value) => `${Math.round(value * 100)} %`}
                formatTick={(value) => `${Math.round(value * 100)}%`}
              />
            </ChartCard>
            <ChartCard
              title="Solar radiation"
              description="All-sky shortwave irradiance at the surface, MJ/m² per day."
            >
              <DailyLineChart
                days={series.days}
                dataKey="solarRadiation"
                name="Solar radiation"
                color={SERIES_COLORS[1]}
                formatValue={(value) => `${value.toFixed(1)} MJ/m²`}
              />
            </ChartCard>
            <ChartCard
              title="Relative humidity"
              description="Daily mean at 2 m above the surface."
            >
              <DailyLineChart
                days={series.days}
                dataKey="humidity"
                name="Humidity"
                color={SERIES_COLORS[0]}
                domain={[0, 100]}
                formatValue={(value) => `${value} %`}
              />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
