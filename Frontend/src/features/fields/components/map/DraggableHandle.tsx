import type { DivIcon, LeafletEventHandlerFnMap, Marker as LeafletMarker } from 'leaflet'
import { Marker } from 'react-leaflet'
import type { LatLng } from '../../model/geo'

type DraggableHandleProps = {
  position: LatLng
  icon: DivIcon
  title: string
  onMove?: (point: LatLng) => void
  onDrop?: (point: LatLng) => void
  onClick?: () => void
  onContextMenu?: () => void
}

function readPosition(target: unknown): LatLng {
  const wrapped = (target as LeafletMarker).getLatLng().wrap()
  return { lat: wrapped.lat, lng: wrapped.lng }
}

export function DraggableHandle({ position, icon, title, onMove, onDrop, onClick, onContextMenu }: DraggableHandleProps) {
  const eventHandlers: LeafletEventHandlerFnMap = {
    drag: (event) => onMove?.(readPosition(event.target)),
    dragend: (event) => onDrop?.(readPosition(event.target)),
    click: () => onClick?.(),
    contextmenu: (event) => {
      event.originalEvent.preventDefault()
      onContextMenu?.()
    },
  }

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={icon}
      title={title}
      draggable
      autoPan
      eventHandlers={eventHandlers}
    />
  )
}
