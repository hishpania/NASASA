import { useMapEvents } from 'react-leaflet'
import { saveMapView } from '../../model/mapView'

/** Remembers the view after every pan and zoom, so the next visit opens where the user left off. */
export function MapViewMemory() {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter().wrap()
      saveMapView({ center: { lat, lng }, zoom: map.getZoom() })
    },
  })
  return null
}
