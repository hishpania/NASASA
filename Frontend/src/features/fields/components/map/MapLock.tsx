import { latLngBounds } from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Bounds } from '../../model/geo'

const FRAME_PADDING = 24
const FRAME_MAX_ZOOM = 16

export function MapLock({ locked, frame }: { locked: boolean; frame: Bounds | null }) {
  const map = useMap()

  useEffect(() => {
    const handlers = [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom, map.keyboard]
    for (const handler of handlers) {
      if (locked) {
        handler.disable()
      } else {
        handler.enable()
      }
    }
    map.zoomControl?.getContainer()?.style.setProperty('display', locked ? 'none' : '')
  }, [map, locked])

  const hasFrame = frame !== null
  const { south, west, north, east } = frame ?? { south: 0, west: 0, north: 0, east: 0 }
  useEffect(() => {
    if (!locked || !hasFrame) {
      return
    }
    map.invalidateSize()
    map.fitBounds(latLngBounds([south, west], [north, east]), {
      padding: [FRAME_PADDING, FRAME_PADDING],
      maxZoom: FRAME_MAX_ZOOM,
      animate: false,
    })
  }, [map, locked, hasFrame, south, west, north, east])

  return null
}
