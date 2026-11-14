import { Polygon, Tooltip } from 'react-leaflet'
import type { Field } from '../../model/collection'
import { ACTIVE_SAVED_PATH, SAVED_PATH } from './pathStyles'

type SavedFieldsLayerProps = {
  entries: readonly Field[]
  activeId: string | null
  hiddenId: string | null
  interactive: boolean
  onSelect: (id: string) => void
}

export function SavedFieldsLayer({ entries, activeId, hiddenId, interactive, onSelect }: SavedFieldsLayerProps) {
  return entries
    .filter(({ id }) => id !== hiddenId)
    .map(({ id, name, shape }) => (
      <Polygon
        key={`${id}-${interactive}`}
        positions={shape.outline.map(({ lat, lng }): [number, number] => [lat, lng])}
        pathOptions={{ ...(id === activeId ? ACTIVE_SAVED_PATH : SAVED_PATH), interactive }}
        eventHandlers={{ click: () => onSelect(id) }}
      >
        {interactive && <Tooltip sticky>{name}</Tooltip>}
      </Polygon>
    ))
}
