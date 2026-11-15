import { Heading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { BASE_LAYERS, type BaseLayerId } from '@/config/map'
import {
  describeDrawingStep,
  DrawingToolbar,
  FieldMap,
  FieldList,
  FieldNameLabel,
  GeolocationNotice,
  LocationSearch,
  MapToolbar,
  readSavedMapView,
  useFieldWorkspace,
  useFields,
  useGeolocation,
  useReverseGeocode,
  WorkspaceNotice,
  type Bounds,
  type DrawingTool,
  type Field,
  type LabelVariant,
  type LatLng,
  type MapFocus,
  type Place,
} from '@/features/fields'
import { useGuide } from '@/features/guide'
import { useCallback, useEffect, useState } from 'react'
import BackhandIndexPointingDown from '~icons/fluent-emoji-flat/backhand-index-pointing-down'
import WorldMap from '~icons/fluent-emoji-flat/world-map'

const renderFieldLabel = (field: Field, variant: LabelVariant) => <FieldNameLabel field={field} variant={variant} />

export function FieldsPage() {
  const workspace = useFieldWorkspace()
  const { selection, collection, editingId } = workspace
  const { draft, shape, previewShape } = selection
  const { current, select } = useFields()
  const geolocation = useGeolocation()
  const { locate } = geolocation
  const { place, isResolving } = useReverseGeocode(previewShape?.center ?? null)
  const [baseLayerId, setBaseLayerId] = useState<BaseLayerId>('satellite')
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [requestedTool, setRequestedTool] = useState<DrawingTool>('select')
  // A returning user opens the map where they left it, not at their GPS position.
  const [opensAtSavedView] = useState(() => readSavedMapView() !== null)

  const focusOn = useCallback((point: LatLng, bounds: Bounds | null = null) => {
    setFocus((previous) => ({ id: (previous?.id ?? 0) + 1, point, bounds }))
  }, [])

  const locateUser = useCallback(
    async (fly = true) => {
      const position = await locate()
      if (position && fly) {
        focusOn(position.point)
      }
    },
    [locate, focusOn],
  )

  useEffect(() => {
    void locateUser(!opensAtSavedView)
  }, [locateUser, opensAtSavedView])

  const currentId = current?.id ?? null

  const selectInList = (id: string) => {
    const entry = collection.find(id)
    select(id)
    if (entry) {
      focusOn(entry.shape.center, entry.shape.bounds)
    }
  }

  const handlePlaceSelect = (selectedPlace: Place) => {
    focusOn(selectedPlace.point, selectedPlace.bounds)
    if (tool === 'radius') {
      selection.setCenter(selectedPlace.point)
    }
  }

  const isEditing = editingId !== null
  const hasDraft = draft.mode === 'polygon' ? draft.vertices.length > 0 : draft.center !== null
  const tool: DrawingTool = requestedTool !== 'select' || hasDraft || isEditing ? draft.mode : 'select'

  const cancelDrawing = useCallback(() => {
    if (isEditing) {
      workspace.cancelEditing()
    } else {
      selection.clear()
    }
    setRequestedTool('select')
  }, [isEditing, workspace, selection])

  const changeTool = (next: DrawingTool) => {
    if (next === 'select') {
      cancelDrawing()
      return
    }
    selection.setMode(next)
    setRequestedTool(next)
  }

  const saveDrawing = () => {
    workspace.commitDraft(place)
    setRequestedTool('select')
  }

  useEffect(() => {
    if (tool === 'select') {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelDrawing()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tool, cancelDrawing])

  const { complete: completeStep } = useGuide()
  useEffect(() => {
    if (!collection.isEmpty) {
      completeStep('field')
    }
  }, [collection.isEmpty, completeStep])

  const mapHint =
    describeDrawingStep(tool, {
      vertexCount: draft.vertices.length,
      isPolygonClosed: draft.isPolygonClosed,
      hasCenter: draft.center !== null,
    }) ??
    (collection.isEmpty && workspace.status === 'ready' ? 'Choose Outline or Circle to draw a field boundary' : null)

  return (
    <div className="flex h-full flex-col-reverse lg:flex-row">
      <aside className="max-h-[45dvh] overflow-y-auto border-t border-zinc-950/5 bg-white lg:max-h-none lg:w-88 lg:shrink-0 lg:border-t-0 lg:border-r dark:border-white/5 dark:bg-zinc-900">
        <div className="space-y-6 p-5">
          <div>
            <Heading>My fields</Heading>
            <Text className="mt-1">Select a field to analyse.</Text>
          </div>

          {workspace.error && <WorkspaceNotice message={workspace.error} />}

          <div className="space-y-3">
            <LocationSearch near={geolocation.position?.point ?? null} onSelect={handlePlaceSelect} />
            {geolocation.error && <GeolocationNotice error={geolocation.error} onRetry={() => void locateUser()} />}
          </div>

          {workspace.status === 'loading' ? (
            <Text>Loading fields…</Text>
          ) : collection.isEmpty ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-950/15 px-4 py-6 text-center dark:border-white/15">
              <WorldMap className="size-10" aria-hidden="true" />
              <p className="text-sm/6 font-medium text-zinc-950 dark:text-white">No fields yet</p>
              <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
                Search for a location, then draw the field boundary with the tools below the map.
              </p>
            </div>
          ) : (
            <FieldList
              collection={collection}
              activeId={currentId}
              analyseHref="/advice"
              onSelect={selectInList}
              onRename={workspace.rename}
              onRenameCommit={workspace.saveName}
              onEdit={workspace.startEditing}
              onRemove={workspace.remove}
            />
          )}
        </div>
      </aside>

      <main className="relative min-h-[55dvh] flex-1">
        <FieldMap
          baseLayer={BASE_LAYERS[baseLayerId]}
          draft={draft}
          isDrawing={tool !== 'select'}
          canClosePolygon={selection.canClosePolygon}
          savedEntries={collection.entries}
          activeId={currentId}
          editingId={editingId}
          focus={focus}
          userPosition={geolocation.position}
          onPlace={selection.placePoint}
          onVertexMove={selection.moveVertex}
          onVertexInsert={selection.insertVertex}
          onVertexRemove={selection.removeVertex}
          onPolygonClose={selection.closePolygon}
          onCenterMove={selection.setCenter}
          onSavedSelect={select}
          renderFieldLabel={renderFieldLabel}
        />
        <MapToolbar
          baseLayerId={baseLayerId}
          isLocating={geolocation.status === 'locating'}
          onBaseLayerChange={setBaseLayerId}
          onLocate={() => void locateUser()}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-1000 flex flex-col items-center gap-2 px-3">
          {mapHint && (
            <p className="flex items-center gap-2 rounded-full bg-zinc-950/85 px-4 py-1.5 text-sm/6 font-medium text-white shadow-lg backdrop-blur">
              <BackhandIndexPointingDown className="size-5 shrink-0" aria-hidden="true" />
              {mapHint}
            </p>
          )}
          <DrawingToolbar
            tool={tool}
            onToolChange={changeTool}
            vertexCount={draft.vertices.length}
            isPolygonClosed={draft.isPolygonClosed}
            canClosePolygon={selection.canClosePolygon}
            radiusMeters={draft.radiusMeters}
            areaHectares={shape?.areaHectares ?? null}
            isEditing={isEditing}
            canSave={shape !== null && !isResolving && !workspace.isSaving && workspace.status === 'ready'}
            onUndo={selection.undoVertex}
            onFinish={selection.closePolygon}
            onRadiusChange={selection.setRadius}
            onSave={saveDrawing}
            onCancel={cancelDrawing}
          />
        </div>
      </main>
    </div>
  )
}
