import type { PathOptions } from 'leaflet'

const DRAFT_COLOR = '#fbbf24'

export const SHAPE_PATH: PathOptions = {
  color: DRAFT_COLOR,
  weight: 3,
  fillColor: DRAFT_COLOR,
  fillOpacity: 0.18,
}

export const DRAFT_PATH: PathOptions = {
  color: DRAFT_COLOR,
  weight: 3,
  dashArray: '8 6',
}

export const SAVED_PATH: PathOptions = {
  color: '#38bdf8',
  weight: 2,
  fillColor: '#38bdf8',
  fillOpacity: 0.15,
  bubblingMouseEvents: false,
}

export const ACTIVE_SAVED_PATH: PathOptions = {
  ...SAVED_PATH,
  color: '#ffffff',
  weight: 3,
  fillOpacity: 0.3,
}

export const ACCURACY_PATH: PathOptions = {
  color: '#3b82f6',
  weight: 1,
  fillColor: '#3b82f6',
  fillOpacity: 0.1,
}

export const USER_LOCATION_PATH: PathOptions = {
  color: '#ffffff',
  weight: 2,
  fillColor: '#2563eb',
  fillOpacity: 1,
}
