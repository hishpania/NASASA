import { Polygon, Tooltip } from 'react-leaflet'
import type { TerritoryEntry } from '../../model/collection'
import { ACTIVE_SAVED_PATH, SAVED_PATH } from './pathStyles'

type SavedTerritoriesLayerProps = {
  entries: readonly TerritoryEntry[]
  activeId: string | null
  hiddenId: string | null
  interactive: boolean
  onSelect: (id: string) => void
}

export function SavedTerritoriesLayer({ entries, activeId, hiddenId, interactive, onSelect }: SavedTerritoriesLayerProps) {
  return entries
    .filter(({ id }) => id !== hiddenId)
    .map(({ id, name, territory }) => (
      <Polygon
        key={`${id}-${interactive}`}
        positions={territory.outline.map(({ lat, lng }): [number, number] => [lat, lng])}
        pathOptions={{ ...(id === activeId ? ACTIVE_SAVED_PATH : SAVED_PATH), interactive }}
        eventHandlers={{ click: () => onSelect(id) }}
      >
        {interactive && <Tooltip sticky>{name}</Tooltip>}
      </Polygon>
    ))
}
