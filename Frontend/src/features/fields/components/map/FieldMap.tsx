import { DEFAULT_VIEW, type BaseLayerConfig } from '@/config/map'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { Field } from '../../model/collection'
import type { FieldDraft } from '../../model/draft'
import type { LatLng } from '../../model/geo'
import type { LocatedPosition } from '../../services'
import { MapFocusController, type MapFocus } from './MapFocusController'
import { MapInteraction } from './MapInteraction'
import { PolygonDraftLayer } from './PolygonDraftLayer'
import { RadiusDraftLayer } from './RadiusDraftLayer'
import { SavedFieldsLayer } from './SavedFieldsLayer'
import { UserLocationLayer } from './UserLocationLayer'

type FieldMapProps = {
  baseLayer: BaseLayerConfig
  draft: FieldDraft
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
}

export function FieldMap({
  baseLayer,
  draft,
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
}: FieldMapProps) {
  const isPlacing = draft.mode === 'radius' || !draft.isPolygonClosed
  const hasDraft = draft.mode === 'polygon' ? draft.vertices.length > 0 : draft.center !== null

  return (
    <MapContainer
      center={[DEFAULT_VIEW.center.lat, DEFAULT_VIEW.center.lng]}
      zoom={DEFAULT_VIEW.zoom}
      doubleClickZoom={false}
      className="size-full"
    >
      <TileLayer key={baseLayer.id} url={baseLayer.url} attribution={baseLayer.attribution} maxZoom={baseLayer.maxZoom} />
      <MapInteraction isPlacing={isPlacing} onPlace={onPlace} />
      <MapFocusController focus={focus} />
      <UserLocationLayer position={userPosition} />
      <SavedFieldsLayer
        entries={savedEntries}
        activeId={activeId}
        hiddenId={editingId}
        interactive={!hasDraft}
        onSelect={onSavedSelect}
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
