import { DEFAULT_VIEW, FOCUS_ZOOM, type BaseLayerConfig } from '@/config/map'
import { latLngBounds } from 'leaflet'
import { useState, type ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { Field } from '../../model/collection'
import type { FieldDraft } from '../../model/draft'
import type { Bounds, LatLng } from '../../model/geo'
import type { LocatedPosition } from '../../services'
import type { LabelVariant } from './labelLayout'
import { MapFocusController, type MapFocus } from './MapFocusController'
import { FollowCurrentField } from './FollowCurrentField'
import { MapInteraction } from './MapInteraction'
import { MapLock } from './MapLock'
import { PolygonDraftLayer } from './PolygonDraftLayer'
import { SavedFieldsLayer } from './SavedFieldsLayer'
import { UserLocationLayer } from './UserLocationLayer'

type FieldMapProps = {
  baseLayer: BaseLayerConfig
  draft: FieldDraft
  /** A drawing tool is in hand: map clicks place points and saved territories stop reacting. */
  isDrawing: boolean
  readOnly?: boolean
  frame?: Bounds | null
  startAt?: Bounds | null
  canClosePolygon: boolean
  savedEntries: readonly Field[]
  activeId: string | null
  editingId: string | null
  focus: MapFocus | null
  userPosition: LocatedPosition | null
  onPlace: (point: LatLng) => void
  onVertexMove: (index: number, point: LatLng) => void
  onVertexInsert: (index: number, point: LatLng) => void
  onVertexRemove: (index: number) => void
  onPolygonClose: () => void
  onSavedSelect: (id: string) => void
  renderFieldLabel?: (field: Field, variant: LabelVariant) => ReactNode
}

export function FieldMap({
  baseLayer,
  draft,
  isDrawing,
  readOnly = false,
  frame = null,
  startAt = null,
  canClosePolygon,
  savedEntries,
  activeId,
  editingId,
  focus,
  userPosition,
  onPlace,
  onVertexMove,
  onVertexInsert,
  onVertexRemove,
  onPolygonClose,
  onSavedSelect,
  renderFieldLabel,
}: FieldMapProps) {
  const isPlacing = isDrawing && !draft.isPolygonClosed
  const [start] = useState(() =>
    startAt ? latLngBounds([startAt.south, startAt.west], [startAt.north, startAt.east]) : null,
  )

  return (
    <MapContainer
      {...(start
        ? { bounds: start, boundsOptions: { maxZoom: FOCUS_ZOOM, padding: [24, 24] as [number, number] } }
        : { center: [DEFAULT_VIEW.center.lat, DEFAULT_VIEW.center.lng] as [number, number], zoom: DEFAULT_VIEW.zoom })}
      doubleClickZoom={false}
      worldCopyJump
      className="size-full"
    >
      <TileLayer
        key={baseLayer.id}
        url={baseLayer.url}
        attribution={baseLayer.attribution}
        maxZoom={baseLayer.maxZoom}
      />
      <MapLock locked={readOnly} frame={frame} />
      <MapInteraction isPlacing={isPlacing} onPlace={onPlace} />
      <MapFocusController focus={focus} />
      <FollowCurrentField field={savedEntries.find(({ id }) => id === activeId) ?? null} />
      <UserLocationLayer position={userPosition} />
      <SavedFieldsLayer
        entries={savedEntries}
        activeId={activeId}
        hiddenId={editingId}
        interactive={!isDrawing && !readOnly}
        onSelect={onSavedSelect}
        renderLabel={renderFieldLabel}
      />
      <PolygonDraftLayer
        vertices={draft.vertices}
        isClosed={draft.isPolygonClosed}
        canClose={canClosePolygon}
        canRemove={!draft.isPolygonClosed || draft.vertices.length > 3}
        onVertexMove={onVertexMove}
        onVertexInsert={onVertexInsert}
        onVertexRemove={onVertexRemove}
        onClose={onPolygonClose}
      />
    </MapContainer>
  )
}
