import { useEffect, useState } from 'react'
import { Marker, Polygon, Polyline } from 'react-leaflet'
import { midpoint, type LatLng } from '../../model/geo'
import { DraggableHandle } from './DraggableHandle'
import { closingVertexIcon, midpointIcon, removeVertexIcon, selectedVertexIcon, vertexIcon } from './handleIcons'
import { DRAFT_PATH, SHAPE_PATH } from './pathStyles'

type PolygonDraftLayerProps = {
  vertices: LatLng[]
  isClosed: boolean
  canClose: boolean
  canRemove: boolean
  onVertexMove: (index: number, point: LatLng) => void
  onVertexInsert: (index: number, point: LatLng) => void
  onVertexRemove: (index: number) => void
  onClose: () => void
}

type EdgeMidpoint = {
  insertAt: number
  point: LatLng
}

function collectMidpoints(vertices: LatLng[], isClosed: boolean): EdgeMidpoint[] {
  const edgeCount = isClosed ? vertices.length : vertices.length - 1
  return Array.from({ length: Math.max(edgeCount, 0) }, (_, index) => ({
    insertAt: index + 1,
    point: midpoint(vertices[index], vertices[(index + 1) % vertices.length]),
  }))
}

export function PolygonDraftLayer({
  vertices,
  isClosed,
  canClose,
  canRemove,
  onVertexMove,
  onVertexInsert,
  onVertexRemove,
  onClose,
}: PolygonDraftLayerProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const lastIndex = vertices.length - 1
  const active = selected !== null && selected <= lastIndex ? selected : isClosed ? null : lastIndex
  const removable = active !== null && active >= 0 && canRemove

  useEffect(() => {
    if (!removable) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable]')) {
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        onVertexRemove(active)
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [removable, active, onVertexRemove])

  if (vertices.length === 0) {
    return null
  }

  const positions = vertices.map(({ lat, lng }): [number, number] => [lat, lng])

  return (
    <>
      {isClosed ? (
        <Polygon positions={positions} pathOptions={SHAPE_PATH} />
      ) : (
        <Polyline positions={positions} pathOptions={DRAFT_PATH} />
      )}
      {collectMidpoints(vertices, isClosed).map(({ insertAt, point }) => (
        <DraggableHandle
          key={`midpoint-${insertAt}-${point.lat}-${point.lng}`}
          position={point}
          icon={midpointIcon}
          title="Click or drag to add a corner"
          onClick={() => onVertexInsert(insertAt, point)}
          onDrop={(dropped) => onVertexInsert(insertAt, dropped)}
        />
      ))}
      {vertices.map((vertex, index) => {
        const closesShape = index === 0 && canClose
        return (
          <DraggableHandle
            key={index}
            position={vertex}
            icon={closesShape ? closingVertexIcon : index === active ? selectedVertexIcon : vertexIcon}
            title={closesShape ? 'Click to close the shape' : `Corner ${index + 1}. Click to select, Delete to remove`}
            onMove={(point) => onVertexMove(index, point)}
            onClick={closesShape ? onClose : () => setSelected(index)}
            onContextMenu={() => onVertexRemove(index)}
          />
        )
      })}
      {removable && (
        <Marker
          key={`remove-${active}`}
          position={[vertices[active].lat, vertices[active].lng]}
          icon={removeVertexIcon}
          zIndexOffset={1000}
          title="Remove point"
          eventHandlers={{
            click: () => {
              onVertexRemove(active)
              setSelected(null)
            },
          }}
        />
      )}
    </>
  )
}
