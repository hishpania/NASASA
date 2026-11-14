import type { LatLng } from '@/features/fields/model/geo'

export type BaseLayerId = 'streets' | 'satellite'

export type BaseLayerConfig = {
  id: BaseLayerId
  label: string
  url: string
  attribution: string
  maxZoom: number
}

export const BASE_LAYERS: Record<BaseLayerId, BaseLayerConfig> = {
  streets: {
    id: 'streets',
    label: 'Map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
}

export const DEFAULT_VIEW: { center: LatLng; zoom: number } = {
  center: { lat: 49.0, lng: 31.4 },
  zoom: 6,
}

export const FOCUS_ZOOM = 15

export const RADIUS_LIMITS = {
  min: 100,
  max: 20_000,
  step: 100,
  initial: 1_000,
} as const

export const SEARCH_SETTINGS = {
  minQueryLength: 3,
  debounceMs: 350,
  limit: 6,
} as const
