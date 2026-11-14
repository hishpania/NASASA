import { useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'
import type { LatLng } from '../../model/geo'

type MapInteractionProps = {
  isPlacing: boolean
  onPlace: (point: LatLng) => void
}

export function MapInteraction({ isPlacing, onPlace }: MapInteractionProps) {
  const map = useMapEvents({
    click: ({ latlng }) => {
      if (isPlacing) {
        onPlace({ lat: latlng.lat, lng: latlng.lng })
      }
    },
  })

  useEffect(() => {
    const container = map.getContainer()
    container.style.cursor = isPlacing ? 'crosshair' : ''
    return () => {
      container.style.cursor = ''
    }
  }, [map, isPlacing])

  return null
}
