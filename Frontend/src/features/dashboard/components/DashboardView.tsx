import { Button } from '@/components/catalyst/button'
import { ArrowPathIcon } from '@heroicons/react/16/solid'
import { useState } from 'react'
import { generateDashboardData } from '../model/demoData'
import { ChartCard } from './ChartCard'
import { CropAreaChart } from './CropAreaChart'
import { NdviTrendChart } from './NdviTrendChart'
import { RainfallChart } from './RainfallChart'
import { StatTile } from './StatTile'

export function DashboardView() {
  const [data, setData] = useState(generateDashboardData)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button outline onClick={() => setData(generateDashboardData())}>
          <ArrowPathIcon data-slot="icon" />
          Regenerate data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <StatTile key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Vegetation index (NDVI)"
          description="Weekly average per field, 0 is bare soil and 1 is dense canopy."
          className="xl:col-span-2"
        >
          <NdviTrendChart fields={data.fields} data={data.ndvi} />
        </ChartCard>
        <ChartCard title="Monthly rainfall" description="Precipitation across all fields, in millimeters.">
          <RainfallChart data={data.rainfall} />
        </ChartCard>
        <ChartCard title="Area by crop" description="Planted hectares for the current season.">
          <CropAreaChart data={data.crops} />
        </ChartCard>
      </div>
    </div>
  )
}
