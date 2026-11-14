import { Circle, CircleMarker } from 'react-leaflet'
import type { LocatedPosition } from '../../services'
import { ACCURACY_PATH, USER_LOCATION_PATH } from './pathStyles'

type UserLocationLayerProps = {
  position: LocatedPosition | null
}

export function UserLocationLayer({ position }: UserLocationLayerProps) {
  if (!position) {
    return null
  }

  const center: [number, number] = [position.point.lat, position.point.lng]

  return (
    <>
      <Circle center={center} radius={position.accuracyMeters} pathOptions={ACCURACY_PATH} interactive={false} />
      <CircleMarker center={center} radius={7} pathOptions={USER_LOCATION_PATH} interactive={false} />
    </>
  )
}
