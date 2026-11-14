import type { ReactNode } from 'react'
import { Polygon, Tooltip } from 'react-leaflet'
import type { Field } from '../../model/collection'
import { ACTIVE_SAVED_PATH, SAVED_PATH } from './pathStyles'

type SavedFieldsLayerProps = {
  entries: readonly Field[]
  activeId: string | null
  hiddenId: string | null
  interactive: boolean
  onSelect: (id: string) => void
  renderLabel?: (field: Field) => ReactNode
}

export function SavedFieldsLayer({
  entries,
  activeId,
  hiddenId,
  interactive,
  onSelect,
  renderLabel,
}: SavedFieldsLayerProps) {
  return entries
    .filter(({ id }) => id !== hiddenId)
    .map((field) => {
      const { id, name, shape } = field
      return (
        <Polygon
          key={`${id}-${interactive}`}
          positions={shape.outline.map(({ lat, lng }): [number, number] => [lat, lng])}
          pathOptions={{ ...(id === activeId ? ACTIVE_SAVED_PATH : SAVED_PATH), interactive }}
          eventHandlers={{ click: () => onSelect(id) }}
        >
          {renderLabel ? (
            <Tooltip permanent direction="center" className="field-label">
              {renderLabel(field)}
            </Tooltip>
          ) : (
            interactive && <Tooltip sticky>{name}</Tooltip>
          )}
        </Polygon>
      )
    })
}
