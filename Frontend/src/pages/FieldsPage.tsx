import { Button } from '@/components/catalyst/button'
import { Divider } from '@/components/catalyst/divider'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { BASE_LAYERS, type BaseLayerId } from '@/config/map'
import { useAuth } from '@/features/auth'
import {
  DraftActions,
  GeolocationNotice,
  LocationSearch,
  MapToolbar,
  PolygonControls,
  RadiusControls,
  ShapeModeSwitch,
  FieldsJson,
  FieldList,
  FieldMap,
  FieldSummary,
  WorkspaceNotice,
  useGeolocation,
  useReverseGeocode,
  useFieldWorkspace,
  type Bounds,
  type LatLng,
  type MapFocus,
  type Place,
} from '@/features/fields'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function FieldsPage() {
  const { session, signOut } = useAuth()
  const workspace = useFieldWorkspace()
  const { selection, collection } = workspace
  const { draft, shape, previewShape } = selection
  const geolocation = useGeolocation()
  const { locate } = geolocation
  const { place, isResolving } = useReverseGeocode(previewShape?.center ?? null)
  const [baseLayerId, setBaseLayerId] = useState<BaseLayerId>('satellite')
  const [focus, setFocus] = useState<MapFocus | null>(null)

  const focusOn = useCallback((point: LatLng, bounds: Bounds | null = null) => {
    setFocus((previous) => ({ id: (previous?.id ?? 0) + 1, point, bounds }))
  }, [])

  const locateUser = useCallback(async () => {
    const position = await locate()
    if (position) {
      focusOn(position.point)
    }
  }, [locate, focusOn])

  useEffect(() => {
    void locateUser()
  }, [locateUser])

  const handlePlaceSelect = (selectedPlace: Place) => {
    focusOn(selectedPlace.point, selectedPlace.bounds)
    if (draft.mode === 'radius') {
      selection.setCenter(selectedPlace.point)
    }
  }

  const focusEntry = (id: string) => {
    const entry = collection.find(id)
    if (entry) {
      workspace.activate(id)
      focusOn(entry.shape.center, entry.shape.bounds)
    }
  }

  const isEditing = workspace.editingId !== null
  const liveCollection = useMemo(
    () => collection.withDraft(previewShape, place, workspace.editingId),
    [collection, previewShape, place, workspace.editingId],
  )

  return (
    <div className="flex h-dvh flex-col-reverse lg:flex-row">
      <aside className="max-h-[55dvh] overflow-y-auto border-t border-zinc-950/5 bg-white lg:max-h-none lg:w-104 lg:shrink-0 lg:border-t-0 lg:border-r dark:border-white/5 dark:bg-zinc-900">
        <div className="space-y-8 p-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Heading>Fields</Heading>
              <Text className="truncate">{session?.user.email}</Text>
            </div>
            <Button plain aria-label="Sign out" onClick={signOut}>
              <ArrowRightStartOnRectangleIcon data-slot="icon" />
            </Button>
          </header>

          {workspace.error && <WorkspaceNotice message={workspace.error} />}

          <div className="space-y-4">
            <LocationSearch near={geolocation.position?.point ?? null} onSelect={handlePlaceSelect} />
            {geolocation.error && <GeolocationNotice error={geolocation.error} onRetry={locateUser} />}
          </div>

          <Divider soft />

          <section className="space-y-4">
            <Subheading>{isEditing ? 'Edit field' : 'New field'}</Subheading>
            <ShapeModeSwitch value={draft.mode} onChange={selection.setMode} />
            {draft.mode === 'polygon' ? (
              <PolygonControls
                vertexCount={draft.vertices.length}
                canClose={selection.canClosePolygon}
                onUndo={selection.undoVertex}
                onClose={selection.closePolygon}
                onClear={selection.clear}
              />
            ) : (
              <RadiusControls
                hasCenter={draft.center !== null}
                radiusMeters={draft.radiusMeters}
                onRadiusChange={selection.setRadius}
                onClear={selection.clear}
              />
            )}
            <FieldSummary shape={shape} place={place} isResolvingPlace={isResolving} />
            <DraftActions
              isEditing={isEditing}
              canCommit={shape !== null && !isResolving && !workspace.isSaving && workspace.status === 'ready'}
              onCommit={() => workspace.commitDraft(place)}
              onCancel={workspace.cancelEditing}
            />
          </section>

          <Divider soft />

          <section className="space-y-4">
            <Subheading>Selected fields</Subheading>
            {workspace.status === 'loading' && <Text>Loading saved fields…</Text>}
            <FieldList
              collection={collection}
              activeId={workspace.activeId}
              editingId={workspace.editingId}
              onActivate={workspace.activate}
              onRename={workspace.rename}
              onRenameCommit={workspace.saveName}
              onFocus={focusEntry}
              onEdit={workspace.startEditing}
              onRemove={workspace.remove}
            />
          </section>

          <Divider soft />

          <section className="space-y-4">
            <Subheading>Output</Subheading>
            <FieldsJson collection={liveCollection} />
          </section>
        </div>
      </aside>

      <main className="relative min-h-[45dvh] flex-1">
        <FieldMap
          baseLayer={BASE_LAYERS[baseLayerId]}
          draft={draft}
          canClosePolygon={selection.canClosePolygon}
          savedEntries={collection.entries}
          activeId={workspace.activeId}
          editingId={workspace.editingId}
          focus={focus}
          userPosition={geolocation.position}
          onPlace={selection.placePoint}
          onVertexMove={selection.moveVertex}
          onVertexInsert={selection.insertVertex}
          onVertexRemove={selection.removeVertex}
          onPolygonClose={selection.closePolygon}
          onCenterMove={selection.setCenter}
          onSavedSelect={workspace.activate}
        />
        <MapToolbar
          baseLayerId={baseLayerId}
          isLocating={geolocation.status === 'locating'}
          onBaseLayerChange={setBaseLayerId}
          onLocate={locateUser}
        />
      </main>
    </div>
  )
}
