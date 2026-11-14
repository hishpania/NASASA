import { FOCUS_ZOOM } from '@/config/map'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Bounds, LatLng } from '../../model/geo'

export type MapFocus = {
  id: number
  point: LatLng
  bounds: Bounds | null
}

type MapFocusControllerProps = {
  focus: MapFocus | null
}

export function MapFocusController({ focus }: MapFocusControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!focus) {
      return
    }
    if (focus.bounds) {
      const { south, west, north, east } = focus.bounds
      map.flyToBounds(
        [
          [south, west],
          [north, east],
        ],
        { maxZoom: FOCUS_ZOOM },
      )
    } else {
      map.flyTo([focus.point.lat, focus.point.lng], FOCUS_ZOOM)
    }
  }, [map, focus])

  return null
}
