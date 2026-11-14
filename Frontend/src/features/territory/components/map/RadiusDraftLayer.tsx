import { Circle } from 'react-leaflet'
import type { LatLng } from '../../model/geo'
import { DraggableHandle } from './DraggableHandle'
import { centerIcon } from './handleIcons'
import { TERRITORY_PATH } from './pathStyles'

type RadiusDraftLayerProps = {
  center: LatLng | null
  radiusMeters: number
  onCenterMove: (point: LatLng) => void
}

export function RadiusDraftLayer({ center, radiusMeters, onCenterMove }: RadiusDraftLayerProps) {
  if (!center) {
    return null
  }

  return (
    <>
      <Circle center={[center.lat, center.lng]} radius={radiusMeters} pathOptions={TERRITORY_PATH} />
      <DraggableHandle position={center} icon={centerIcon} title="Territory center" onMove={onCenterMove} />
    </>
  )
}
