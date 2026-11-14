import { RADIUS_LIMITS } from '@/config/map'
import type { LatLng } from './geo'
import { PolygonShape, RadiusShape, type ShapeMode, type Shape } from './shape'

export type FieldDraft = {
  mode: ShapeMode
  vertices: LatLng[]
  isPolygonClosed: boolean
  center: LatLng | null
  radiusMeters: number
}

export type FieldDraftAction =
  | { type: 'modeChanged'; mode: ShapeMode }
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
  | { type: 'shapeLoaded'; shape: Shape }

export const initialFieldDraft: FieldDraft = {
  mode: 'polygon',
  vertices: [],
  isPolygonClosed: false,
  center: null,
  radiusMeters: RADIUS_LIMITS.initial,
}

export function fieldDraftReducer(state: FieldDraft, action: FieldDraftAction): FieldDraft {
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
      return { ...initialFieldDraft, mode: state.mode, radiusMeters: state.radiusMeters }
    case 'shapeLoaded':
      return loadShape(action.shape)
  }
}

function loadShape(shape: Shape): FieldDraft {
  if (shape instanceof PolygonShape) {
    return { ...initialFieldDraft, mode: 'polygon', vertices: [...shape.vertices], isPolygonClosed: true }
  }
  if (shape instanceof RadiusShape) {
    return { ...initialFieldDraft, mode: 'radius', center: shape.origin, radiusMeters: shape.radiusMeters }
  }
  return initialFieldDraft
}

export function canClosePolygon(state: FieldDraft): boolean {
  return !state.isPolygonClosed && state.vertices.length >= PolygonShape.MIN_VERTICES
}

export function canRemoveVertex(state: FieldDraft): boolean {
  return !state.isPolygonClosed || state.vertices.length > PolygonShape.MIN_VERTICES
}

export function buildShape(state: FieldDraft): Shape | null {
  if (state.mode === 'polygon') {
    return state.isPolygonClosed ? new PolygonShape(state.vertices) : null
  }
  return state.center ? new RadiusShape(state.center, state.radiusMeters) : null
}

export function buildPreviewShape(state: FieldDraft): Shape | null {
  if (state.mode === 'polygon') {
    return state.vertices.length >= PolygonShape.MIN_VERTICES ? new PolygonShape(state.vertices) : null
  }
  return buildShape(state)
}

function clampRadius(radiusMeters: number): number {
  if (!Number.isFinite(radiusMeters)) {
    return RADIUS_LIMITS.min
  }
  return Math.min(RADIUS_LIMITS.max, Math.max(RADIUS_LIMITS.min, radiusMeters))
}
