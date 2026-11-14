import { useCallback, useMemo, useReducer } from 'react'
import type { LatLng } from '../model/geo'
import {
  buildPreviewShape,
  buildShape,
  canClosePolygon,
  initialFieldDraft,
  fieldDraftReducer,
} from '../model/draft'
import type { ShapeMode, Shape } from '../model/shape'

export function useFieldDraft() {
  const [draft, dispatch] = useReducer(fieldDraftReducer, initialFieldDraft)

  const shape = useMemo(() => buildShape(draft), [draft])
  const previewShape = useMemo(() => buildPreviewShape(draft), [draft])

  const placePoint = useCallback(
    (point: LatLng) => {
      dispatch(draft.mode === 'polygon' ? { type: 'vertexAdded', point } : { type: 'centerChanged', point })
    },
    [draft.mode],
  )

  const actions = useMemo(
    () => ({
      setMode: (mode: ShapeMode) => dispatch({ type: 'modeChanged', mode }),
      moveVertex: (index: number, point: LatLng) => dispatch({ type: 'vertexMoved', index, point }),
      insertVertex: (index: number, point: LatLng) => dispatch({ type: 'vertexInserted', index, point }),
      removeVertex: (index: number) => dispatch({ type: 'vertexRemoved', index }),
      undoVertex: () => dispatch({ type: 'lastVertexRemoved' }),
      closePolygon: () => dispatch({ type: 'polygonClosed' }),
      setCenter: (point: LatLng) => dispatch({ type: 'centerChanged', point }),
      setRadius: (radiusMeters: number) => dispatch({ type: 'radiusChanged', radiusMeters }),
      clear: () => dispatch({ type: 'cleared' }),
      reset: () => dispatch({ type: 'reset' }),
      load: (shape: Shape) => dispatch({ type: 'shapeLoaded', shape }),
    }),
    [],
  )

  return {
    draft,
    shape,
    previewShape,
    canClosePolygon: canClosePolygon(draft),
    placePoint,
    ...actions,
  }
}
