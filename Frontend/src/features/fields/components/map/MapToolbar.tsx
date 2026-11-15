import { Button } from '@/components/catalyst/button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { BASE_LAYERS, type BaseLayerId } from '@/config/map'
import { ArrowPathIcon, MapPinIcon } from '@heroicons/react/16/solid'

const BASE_LAYER_OPTIONS = Object.values(BASE_LAYERS).map(({ id, label }) => ({ value: id, label }))

type MapToolbarProps = {
  baseLayerId: BaseLayerId
  isLocating: boolean
  onBaseLayerChange: (id: BaseLayerId) => void
  onLocate: () => void
}

export function MapToolbar({ baseLayerId, isLocating, onBaseLayerChange, onLocate }: MapToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-1000 flex justify-end p-3">
      <div className="pointer-events-auto flex items-center gap-2">
        <Button color="white" onClick={onLocate} disabled={isLocating} aria-label="Show my location" title="Your browser will ask to share your location">
          {isLocating ? <ArrowPathIcon data-slot="icon" className="animate-spin" /> : <MapPinIcon data-slot="icon" />}
          <span className="max-sm:hidden">My location</span>
        </Button>
        <SegmentedControl
          aria-label="Base map"
          value={baseLayerId}
          options={BASE_LAYER_OPTIONS}
          onChange={onBaseLayerChange}
          variant="floating"
        />
      </div>
    </div>
  )
}
