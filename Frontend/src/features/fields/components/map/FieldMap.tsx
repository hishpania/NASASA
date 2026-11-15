import type { BaseLayerConfig } from '@/config/map'
import { useState, type ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { Field } from '../../model/collection'
import type { FieldDraft } from '../../model/draft'
import type { LatLng } from '../../model/geo'
import { initialMapView } from '../../model/mapView'
import type { LocatedPosition } from '../../services'
import type { LabelVariant } from './labelLayout'
import { MapFocusController, type MapFocus } from './MapFocusController'
import { FollowCurrentField } from './FollowCurrentField'
import { MapInteraction } from './MapInteraction'
import { MapViewMemory } from './MapViewMemory'
import { PolygonDraftLayer } from './PolygonDraftLayer'
import { RadiusDraftLayer } from './RadiusDraftLayer'
import { SavedFieldsLayer } from './SavedFieldsLayer'
import { UserLocationLayer } from './UserLocationLayer'

type FieldMapProps = {
  baseLayer: BaseLayerConfig
  draft: FieldDraft
  /** A drawing tool is in hand: map clicks place points and saved territories stop reacting. */
  isDrawing: boolean
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
  onCenterMove: (point: LatLng) => void
  onSavedSelect: (id: string) => void
  renderFieldLabel?: (field: Field, variant: LabelVariant) => ReactNode
}

export function FieldMap({
  baseLayer,
  draft,
  isDrawing,
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
  onCenterMove,
  onSavedSelect,
  renderFieldLabel,
}: FieldMapProps) {
  const isPlacing = isDrawing && (draft.mode === 'radius' || !draft.isPolygonClosed)
  const [view] = useState(initialMapView)

  return (
    <MapContainer
      center={[view.center.lat, view.center.lng]}
      zoom={view.zoom}
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
      <MapInteraction isPlacing={isPlacing} onPlace={onPlace} />
      <MapFocusController focus={focus} />
      <MapViewMemory />
      <FollowCurrentField field={savedEntries.find(({ id }) => id === activeId) ?? null} />
      <UserLocationLayer position={userPosition} />
      <SavedFieldsLayer
        entries={savedEntries}
        activeId={activeId}
        hiddenId={editingId}
        interactive={!isDrawing}
        onSelect={onSavedSelect}
        renderLabel={renderFieldLabel}
      />
      {draft.mode === 'polygon' ? (
        <PolygonDraftLayer
          vertices={draft.vertices}
          isClosed={draft.isPolygonClosed}
          canClose={canClosePolygon}
          onVertexMove={onVertexMove}
          onVertexInsert={onVertexInsert}
          onVertexRemove={onVertexRemove}
          onClose={onPolygonClose}
        />
      ) : (
        <RadiusDraftLayer center={draft.center} radiusMeters={draft.radiusMeters} onCenterMove={onCenterMove} />
      )}
    </MapContainer>
  )
}
