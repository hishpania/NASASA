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

export function wrapLng(lng: number): number {
  if (lng >= -180 && lng <= 180) {
    return lng
  }
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 && lng > 0 ? 180 : wrapped
}

export function normalizeLatLng({ lat, lng }: LatLng): LatLng {
  return {
    lat: Math.max(-90, Math.min(90, lat)),
    lng: wrapLng(lng),
  }
}

export function toPosition({ lat, lng }: LatLng): LngLatPosition {
  return [wrapLng(lng), lat]
}

export function fromPosition([lng, lat]: number[]): LatLng {
  return { lat, lng: wrapLng(lng) }
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return normalizeLatLng({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 })
}
