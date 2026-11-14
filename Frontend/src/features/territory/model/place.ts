import type { Bounds, LatLng } from './geo'

export type Address = {
  district: string | null
  city: string | null
  county: string | null
  state: string | null
  country: string | null
  countryCode: string | null
  postcode: string | null
}

export type Place = {
  id: string
  name: string
  description: string
  point: LatLng
  bounds: Bounds | null
  address: Address
}

export function formatPlace(place: Place): string {
  return [place.name, place.description].filter(Boolean).join(', ')
}
