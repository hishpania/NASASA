import { useCallback, useMemo, useReducer } from 'react'
import type { LatLng } from '../model/geo'
import {
  buildPreviewTerritory,
  buildTerritory,
  canClosePolygon,
  initialTerritoryDraft,
  territoryDraftReducer,
} from '../model/draft'
import type { SelectionMode, Territory } from '../model/territory'

export function useTerritoryDraft() {
  const [draft, dispatch] = useReducer(territoryDraftReducer, initialTerritoryDraft)

  const territory = useMemo(() => buildTerritory(draft), [draft])
  const previewTerritory = useMemo(() => buildPreviewTerritory(draft), [draft])

  const placePoint = useCallback(
    (point: LatLng) => {
      dispatch(draft.mode === 'polygon' ? { type: 'vertexAdded', point } : { type: 'centerChanged', point })
    },
    [draft.mode],
  )

  const actions = useMemo(
    () => ({
      setMode: (mode: SelectionMode) => dispatch({ type: 'modeChanged', mode }),
      moveVertex: (index: number, point: LatLng) => dispatch({ type: 'vertexMoved', index, point }),
      insertVertex: (index: number, point: LatLng) => dispatch({ type: 'vertexInserted', index, point }),
      removeVertex: (index: number) => dispatch({ type: 'vertexRemoved', index }),
      undoVertex: () => dispatch({ type: 'lastVertexRemoved' }),
      closePolygon: () => dispatch({ type: 'polygonClosed' }),
      setCenter: (point: LatLng) => dispatch({ type: 'centerChanged', point }),
      setRadius: (radiusMeters: number) => dispatch({ type: 'radiusChanged', radiusMeters }),
      clear: () => dispatch({ type: 'cleared' }),
      reset: () => dispatch({ type: 'reset' }),
      load: (territory: Territory) => dispatch({ type: 'territoryLoaded', territory }),
    }),
    [],
  )

  return {
    draft,
    territory,
    previewTerritory,
    canClosePolygon: canClosePolygon(draft),
    placePoint,
    ...actions,
  }
}
