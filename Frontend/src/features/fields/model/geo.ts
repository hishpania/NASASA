export type LatLng = {
  lat: number
  lng: number
}

export type Bounds = {
  south: number
  west: number
  north: number
  east: number
}

export type LngLatPosition = [lng: number, lat: number]

export function toPosition({ lat, lng }: LatLng): LngLatPosition {
  return [lng, lat]
}

export function fromPosition([lng, lat]: number[]): LatLng {
  return { lat, lng }
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}
