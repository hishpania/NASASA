import type { LatLng } from '@/features/territory/model/geo'

const hectareFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const kilometerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const meterFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatHectares(hectares: number): string {
  return `${hectareFormatter.format(hectares)} ha`
}

export function formatDistance(meters: number): string {
  return meters >= 1_000 ? `${kilometerFormatter.format(meters / 1_000)} km` : `${meterFormatter.format(meters)} m`
}

export function formatCoordinates({ lat, lng }: LatLng): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
