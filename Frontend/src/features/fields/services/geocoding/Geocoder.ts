import type { LatLng } from '../../model/geo'
import type { Place } from '../../model/place'

export type PlaceSearchOptions = {
  signal?: AbortSignal
  near?: LatLng
  limit?: number
}

export interface Geocoder {
  search(query: string, options?: PlaceSearchOptions): Promise<Place[]>
  reverse(point: LatLng, signal?: AbortSignal): Promise<Place | null>
}
