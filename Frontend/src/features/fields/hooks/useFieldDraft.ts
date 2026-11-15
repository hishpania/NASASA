import { useMemo, useReducer } from 'react'
import type { LatLng } from '../model/geo'
import {
  buildPreviewShape,
  buildShape,
  canClosePolygon,
  initialFieldDraft,
  fieldDraftReducer,
} from '../model/draft'
import type { Shape } from '../model/shape'

export function useFieldDraft() {
  const [draft, dispatch] = useReducer(fieldDraftReducer, initialFieldDraft)

  const shape = useMemo(() => buildShape(draft), [draft])
  const previewShape = useMemo(() => buildPreviewShape(draft), [draft])

  const actions = useMemo(
    () => ({
      placePoint: (point: LatLng) => dispatch({ type: 'vertexAdded', point }),
      moveVertex: (index: number, point: LatLng) => dispatch({ type: 'vertexMoved', index, point }),
      insertVertex: (index: number, point: LatLng) => dispatch({ type: 'vertexInserted', index, point }),
      removeVertex: (index: number) => dispatch({ type: 'vertexRemoved', index }),
      undoVertex: () => dispatch({ type: 'lastVertexRemoved' }),
      closePolygon: () => dispatch({ type: 'polygonClosed' }),
      clear: () => dispatch({ type: 'cleared' }),
      reset: () => dispatch({ type: 'cleared' }),
      load: (shape: Shape) => dispatch({ type: 'shapeLoaded', shape }),
    }),
    [],
  )

  return {
    draft,
    shape,
    previewShape,
    canClosePolygon: canClosePolygon(draft),
    ...actions,
  }
}
