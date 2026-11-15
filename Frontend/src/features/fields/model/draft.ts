import type { LatLng } from './geo'
import { PolygonShape, RadiusShape, type Shape } from './shape'

const CIRCLE_EDIT_VERTICES = 16

export type FieldDraft = {
  vertices: LatLng[]
  isPolygonClosed: boolean
}

export type FieldDraftAction =
  | { type: 'vertexAdded'; point: LatLng }
  | { type: 'vertexMoved'; index: number; point: LatLng }
  | { type: 'vertexInserted'; index: number; point: LatLng }
  | { type: 'vertexRemoved'; index: number }
  | { type: 'lastVertexRemoved' }
  | { type: 'polygonClosed' }
  | { type: 'cleared' }
  | { type: 'shapeLoaded'; shape: Shape }

export const initialFieldDraft: FieldDraft = {
  vertices: [],
  isPolygonClosed: false,
}

export function fieldDraftReducer(state: FieldDraft, action: FieldDraftAction): FieldDraft {
  switch (action.type) {
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
    case 'cleared':
      return initialFieldDraft
    case 'shapeLoaded':
      return { vertices: verticesOf(action.shape), isPolygonClosed: true }
  }
}

function verticesOf(shape: Shape): LatLng[] {
  if (shape instanceof RadiusShape) {
    const outline = shape.outline.slice(0, -1)
    const step = Math.max(1, Math.floor(outline.length / CIRCLE_EDIT_VERTICES))
    return outline.filter((_, index) => index % step === 0)
  }
  return [...shape.points]
}

export function canClosePolygon(state: FieldDraft): boolean {
  return !state.isPolygonClosed && state.vertices.length >= PolygonShape.MIN_VERTICES
}

export function canRemoveVertex(state: FieldDraft): boolean {
  return !state.isPolygonClosed || state.vertices.length > PolygonShape.MIN_VERTICES
}

export function buildShape(state: FieldDraft): Shape | null {
  return state.isPolygonClosed ? new PolygonShape(state.vertices) : null
}

export function buildPreviewShape(state: FieldDraft): Shape | null {
  return state.vertices.length >= PolygonShape.MIN_VERTICES ? new PolygonShape(state.vertices) : null
}
