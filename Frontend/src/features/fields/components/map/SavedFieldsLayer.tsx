import { useState, type ReactNode } from 'react'
import { Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { Field } from '../../model/collection'
import { layoutLabels, type LabelVariant } from './labelLayout'
import { ACTIVE_SAVED_PATH, SAVED_PATH } from './pathStyles'

type SavedFieldsLayerProps = {
  entries: readonly Field[]
  activeId: string | null
  hiddenId: string | null
  interactive: boolean
  onSelect: (id: string) => void
  renderLabel?: (field: Field, variant: LabelVariant) => ReactNode
}

export function SavedFieldsLayer({
  entries,
  activeId,
  hiddenId,
  interactive,
  onSelect,
  renderLabel,
}: SavedFieldsLayerProps) {
  const map = useMap()
  const [, setViewVersion] = useState(0)
  useMapEvents({
    zoomend: () => setViewVersion((version) => version + 1),
    moveend: () => setViewVersion((version) => version + 1),
    resize: () => setViewVersion((version) => version + 1),
  })

  const visible = entries.filter(({ id }) => id !== hiddenId)
  const layout = renderLabel
    ? layoutLabels(
        visible.map(({ id, shape }) => {
          const { south, west, north, east } = shape.bounds
          const topLeft = map.latLngToContainerPoint([north, west])
          const bottomRight = map.latLngToContainerPoint([south, east])
          return {
            id,
            center: map.latLngToContainerPoint([shape.center.lat, shape.center.lng]),
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(bottomRight.y - topLeft.y),
            priority: id === activeId ? Number.POSITIVE_INFINITY : shape.areaHectares,
          }
        }),
      )
    : new Map<string, LabelVariant>()

  return visible.map((field) => {
    const { id, name, shape } = field
    const variant = layout.get(id)
    return (
      <Polygon
        key={`${id}-${interactive}`}
        positions={shape.outline.map(({ lat, lng }): [number, number] => [lat, lng])}
        pathOptions={{ ...(id === activeId ? ACTIVE_SAVED_PATH : SAVED_PATH), interactive }}
        eventHandlers={{ click: () => onSelect(id) }}
      >
        {renderLabel && variant ? (
          <Tooltip key={variant} permanent direction="center" className={`field-label field-label-${variant}`}>
            {renderLabel(field, variant)}
          </Tooltip>
        ) : (
          interactive && <Tooltip sticky>{name}</Tooltip>
        )}
      </Polygon>
    )
  })
}
