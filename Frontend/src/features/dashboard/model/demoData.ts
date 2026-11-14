export type NdviPoint = { week: string } & Record<string, number | string>;

export type RainfallPoint = { month: string; millimeters: number };

export type CropArea = { crop: string; hectares: number };

export type Kpi = {
  label: string;
  value: string;
  delta: number;
  unit: string;
};

export type DashboardData = {
  fields: readonly string[];
  ndvi: NdviPoint[];
  rainfall: RainfallPoint[];
  crops: CropArea[];
  kpis: Kpi[];
};

const FIELD_NAMES = ["North field", "River plot", "East slope"] as const;
const CROPS = ["Wheat", "Corn", "Sunflower", "Soybean", "Barley"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const WEEKS = 16;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentChange(current: number, previous: number): number {
  return previous === 0 ? 0 : ((current - previous) / previous) * 100;
}

function generateNdvi(): NdviPoint[] {
  const peaks = FIELD_NAMES.map(() => randomBetween(0.65, 0.88));
  const offsets = FIELD_NAMES.map(() => randomBetween(-2, 2));

  return Array.from({ length: WEEKS }, (_, index) => {
    const point: NdviPoint = { week: `W${index + 1}` };
    FIELD_NAMES.forEach((field, fieldIndex) => {
      const season = Math.sin(
        ((index + offsets[fieldIndex]) / (WEEKS - 1)) * Math.PI,
      );
      const value =
        0.18 + (peaks[fieldIndex] - 0.18) * season + randomBetween(-0.04, 0.04);
      point[field] = round(clamp(value, 0.05, 0.95), 2);
    });
    return point;
  });
}

function generateRainfall(): RainfallPoint[] {
  return MONTHS.map((month, index) => {
    const seasonal = 35 + 30 * Math.sin(((index - 2) / 11) * Math.PI);
    return {
      month,
      millimeters: Math.round(clamp(seasonal + randomBetween(-18, 18), 4, 120)),
    };
  });
}

function generateCrops(): CropArea[] {
  return CROPS.map((crop) => ({
    crop,
    hectares: Math.round(randomBetween(40, 420)),
  })).sort((a, b) => b.hectares - a.hectares);
}

function averageNdvi(point: NdviPoint): number {
  const values = FIELD_NAMES.map((field) => Number(point[field]));
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildKpis(
  ndvi: NdviPoint[],
  rainfall: RainfallPoint[],
  crops: CropArea[],
): Kpi[] {
  const totalArea = crops.reduce((sum, { hectares }) => sum + hectares, 0);
  const latestNdvi = averageNdvi(ndvi[ndvi.length - 1]);
  const previousNdvi = averageNdvi(ndvi[ndvi.length - 2]);
  const currentMonth = new Date().getMonth();
  const rainNow = rainfall[currentMonth].millimeters;
  const rainBefore = rainfall[(currentMonth + 11) % 12].millimeters;

  return [
    {
      label: "Total area",
      value: totalArea.toLocaleString("en-US"),
      unit: "ha",
      delta: randomBetween(-4, 9),
    },
    { label: "Fields", value: String(FIELD_NAMES.length), unit: "", delta: 0 },
    {
      label: "Average NDVI",
      value: latestNdvi.toFixed(2),
      unit: "",
      delta: percentChange(latestNdvi, previousNdvi),
    },
    {
      label: "Rainfall this month",
      value: String(rainNow),
      unit: "mm",
      delta: percentChange(rainNow, rainBefore),
    },
  ];
}

export function generateDashboardData(): DashboardData {
  const ndvi = generateNdvi();
  const rainfall = generateRainfall();
  const crops = generateCrops();

  return {
    fields: FIELD_NAMES,
    ndvi,
    rainfall,
    crops,
    kpis: buildKpis(ndvi, rainfall, crops),
  };
}
