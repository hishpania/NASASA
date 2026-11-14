import { RADIUS_LIMITS } from '@/config/map'
import type { LatLng } from './geo'
import { PolygonTerritory, RadiusTerritory, type SelectionMode, type Territory } from './territory'

export type TerritoryDraft = {
  mode: SelectionMode
  vertices: LatLng[]
  isPolygonClosed: boolean
  center: LatLng | null
  radiusMeters: number
}

export type TerritoryDraftAction =
  | { type: 'modeChanged'; mode: SelectionMode }
  | { type: 'vertexAdded'; point: LatLng }
  | { type: 'vertexMoved'; index: number; point: LatLng }
  | { type: 'vertexInserted'; index: number; point: LatLng }
  | { type: 'vertexRemoved'; index: number }
  | { type: 'lastVertexRemoved' }
  | { type: 'polygonClosed' }
  | { type: 'centerChanged'; point: LatLng }
  | { type: 'radiusChanged'; radiusMeters: number }
  | { type: 'cleared' }
  | { type: 'reset' }
  | { type: 'territoryLoaded'; territory: Territory }

export const initialTerritoryDraft: TerritoryDraft = {
  mode: 'polygon',
  vertices: [],
  isPolygonClosed: false,
  center: null,
  radiusMeters: RADIUS_LIMITS.initial,
}

export function territoryDraftReducer(state: TerritoryDraft, action: TerritoryDraftAction): TerritoryDraft {
  switch (action.type) {
    case 'modeChanged':
      return { ...state, mode: action.mode }
    case 'vertexAdded':
      return state.isPolygonClosed ? state : { ...state, vertices: [...state.vertices, action.point] }
    case 'vertexMoved':
      return {
        ...state,
        vertices: state.vertices.map((vertex, index) => (index === action.index ? action.point : vertex)),
      }
    case 'vertexInserted':
      return {
        ...state,
        vertices: [...state.vertices.slice(0, action.index), action.point, ...state.vertices.slice(action.index)],
      }
    case 'vertexRemoved':
      return canRemoveVertex(state)
        ? { ...state, vertices: state.vertices.filter((_, index) => index !== action.index) }
        : state
    case 'lastVertexRemoved':
      return { ...state, vertices: state.vertices.slice(0, -1), isPolygonClosed: false }
    case 'polygonClosed':
      return canClosePolygon(state) ? { ...state, isPolygonClosed: true } : state
    case 'centerChanged':
      return { ...state, center: action.point }
    case 'radiusChanged':
      return { ...state, radiusMeters: clampRadius(action.radiusMeters) }
    case 'cleared':
      return state.mode === 'polygon'
        ? { ...state, vertices: [], isPolygonClosed: false }
        : { ...state, center: null, radiusMeters: RADIUS_LIMITS.initial }
    case 'reset':
      return { ...initialTerritoryDraft, mode: state.mode, radiusMeters: state.radiusMeters }
    case 'territoryLoaded':
      return loadTerritory(action.territory)
  }
}

function loadTerritory(territory: Territory): TerritoryDraft {
  if (territory instanceof PolygonTerritory) {
    return { ...initialTerritoryDraft, mode: 'polygon', vertices: [...territory.vertices], isPolygonClosed: true }
  }
  if (territory instanceof RadiusTerritory) {
    return { ...initialTerritoryDraft, mode: 'radius', center: territory.origin, radiusMeters: territory.radiusMeters }
  }
  return initialTerritoryDraft
}

export function canClosePolygon(state: TerritoryDraft): boolean {
  return !state.isPolygonClosed && state.vertices.length >= PolygonTerritory.MIN_VERTICES
}

export function canRemoveVertex(state: TerritoryDraft): boolean {
  return !state.isPolygonClosed || state.vertices.length > PolygonTerritory.MIN_VERTICES
}

export function buildTerritory(state: TerritoryDraft): Territory | null {
  if (state.mode === 'polygon') {
    return state.isPolygonClosed ? new PolygonTerritory(state.vertices) : null
  }
  return state.center ? new RadiusTerritory(state.center, state.radiusMeters) : null
}

export function buildPreviewTerritory(state: TerritoryDraft): Territory | null {
  if (state.mode === 'polygon') {
    return state.vertices.length >= PolygonTerritory.MIN_VERTICES ? new PolygonTerritory(state.vertices) : null
  }
  return buildTerritory(state)
}

function clampRadius(radiusMeters: number): number {
  if (!Number.isFinite(radiusMeters)) {
    return RADIUS_LIMITS.min
  }
  return Math.min(RADIUS_LIMITS.max, Math.max(RADIUS_LIMITS.min, radiusMeters))
}
