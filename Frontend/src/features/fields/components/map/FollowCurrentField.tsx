import { FOCUS_ZOOM } from '@/config/map'
import { latLngBounds } from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { Field } from '../../model/collection'

/**
 * Brings the current field into view when it changes, e.g. from the header switcher.
 * The first one after loading and any that is already on screen leave the map where it is.
 */
export function FollowCurrentField({ field }: { field: Field | null }) {
  const map = useMap()
  const shownId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const previousId = shownId.current
    shownId.current = field?.id ?? null
    if (previousId == null || field === null || field.id === previousId) {
      return
    }
    const { south, west, north, east } = field.shape.bounds
    const bounds = latLngBounds([south, west], [north, east])
    if (!map.getBounds().contains(bounds)) {
      map.flyToBounds(bounds, { maxZoom: FOCUS_ZOOM })
    }
  }, [map, field])

  return null
}
