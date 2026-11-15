import { DEFAULT_VIEW } from '@/config/map'
import { localStore } from '@/lib/storage'
import type { LatLng } from './geo'

export type MapView = { center: LatLng; zoom: number }

const STORAGE_KEY = 'neosphere.mapView'

function isMapView(value: unknown): value is MapView {
  const view = value as MapView | null
  return typeof view?.zoom === 'number' && Number.isFinite(view.center?.lat) && Number.isFinite(view.center?.lng)
}

/** Where the map was left last time in this browser, if anywhere. */
export function readSavedMapView(): MapView | null {
  const saved = localStore.read<unknown>(STORAGE_KEY)
  return isMapView(saved) ? saved : null
}

export function initialMapView(): MapView {
  return readSavedMapView() ?? DEFAULT_VIEW
}

export function saveMapView(view: MapView): void {
  localStore.write(STORAGE_KEY, view)
}
