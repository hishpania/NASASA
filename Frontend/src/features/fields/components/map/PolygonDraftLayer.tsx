import { Polygon, Polyline } from 'react-leaflet'
import { midpoint, type LatLng } from '../../model/geo'
import { DraggableHandle } from './DraggableHandle'
import { closingVertexIcon, midpointIcon, vertexIcon } from './handleIcons'
import { DRAFT_PATH, SHAPE_PATH } from './pathStyles'

type PolygonDraftLayerProps = {
  vertices: LatLng[]
  isClosed: boolean
  canClose: boolean
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
  onVertexMove,
  onVertexInsert,
  onVertexRemove,
  onClose,
}: PolygonDraftLayerProps) {
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
            icon={closesShape ? closingVertexIcon : vertexIcon}
            title={closesShape ? 'Click to close the shape' : `Corner ${index + 1}. Right-click to remove`}
            onMove={(point) => onVertexMove(index, point)}
            onClick={closesShape ? onClose : undefined}
            onContextMenu={() => onVertexRemove(index)}
          />
        )
      })}
    </>
  )
}
