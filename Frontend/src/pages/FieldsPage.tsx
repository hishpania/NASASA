import { Heading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { BASE_LAYERS, type BaseLayerId } from '@/config/map'
import {
  describeDrawingStep,
  DrawingToolbar,
  FieldMap,
  FieldList,
  FieldNameLabel,
  FirstFieldSteps,
  GeolocationNotice,
  LocationSearch,
  MapToolbar,
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
import { DesktopOnlyNote } from '@/components/ui/DesktopOnlyNote'
import { NoFieldState } from '@/components/ui/NoFieldState'
import { useIsPhone } from '@/lib/useIsPhone'
import { PencilIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import BackhandIndexPointingDown from '~icons/fluent-emoji-flat/backhand-index-pointing-down'

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
  const [hasStartedFirstField, setStartedFirstField] = useState(false)
  const isPhone = useIsPhone()

  const focusOn = useCallback((point: LatLng, bounds: Bounds | null = null) => {
    setFocus((previous) => ({ id: (previous?.id ?? 0) + 1, point, bounds }))
  }, [])

  const locateUser = useCallback(async () => {
    const position = await locate()
    if (position) {
      focusOn(position.point)
    }
  }, [locate, focusOn])

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
  }

  const isEditing = editingId !== null
  const hasDraft = draft.vertices.length > 0
  const tool: DrawingTool = !isPhone && (requestedTool !== 'select' || hasDraft || isEditing) ? 'polygon' : 'select'

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

  useEffect(() => {
    if (!hasStartedFirstField && !isPhone && workspace.status === 'ready' && collection.isEmpty) {
      setStartedFirstField(true)
      setRequestedTool('polygon')
    }
  }, [hasStartedFirstField, isPhone, workspace.status, collection.isEmpty])

  const showsFirstFieldTitle = collection.isEmpty && tool === 'polygon' && draft.vertices.length === 0

  const mapHint =
    describeDrawingStep(tool, {
      vertexCount: draft.vertices.length,
      isPolygonClosed: draft.isPolygonClosed,
    }) ??
    (!isPhone && collection.isEmpty && workspace.status === 'ready' ? 'Choose Outline to draw a field boundary' : null)

  return (
    <div className="flex h-full flex-col-reverse lg:flex-row">
      <aside
        className={clsx(
          'overflow-y-auto border-t border-zinc-950/5 bg-white lg:max-h-none lg:w-88 lg:shrink-0 lg:border-t-0 lg:border-r dark:border-white/5 dark:bg-zinc-900',
          isPhone ? 'flex-1' : 'max-h-[45dvh]',
          isPhone && collection.isEmpty && 'border-t-0',
        )}
      >
        <div className="space-y-6 p-5">
          <div>
            <Heading>My fields</Heading>
            <Text className="mt-1">Select a field to analyse.</Text>
          </div>

          {workspace.error && <WorkspaceNotice message={workspace.error} />}

          {!isPhone && (
            <div className="space-y-3">
              <LocationSearch near={geolocation.position?.point ?? null} onSelect={handlePlaceSelect} />
              {geolocation.error && <GeolocationNotice error={geolocation.error} onRetry={() => void locateUser()} />}
            </div>
          )}

          {workspace.status === 'loading' ? (
            <Text>Loading fields…</Text>
          ) : collection.isEmpty ? (
            isPhone ? (
              <NoFieldState
                title="No fields yet"
                description="Here you can view your fields, their climate and crop advice."
              />
            ) : (
              <FirstFieldSteps />
            )
          ) : (
            <FieldList
              collection={collection}
              activeId={currentId}
              analyseHref="/advice"
              onSelect={selectInList}
              onRename={workspace.rename}
              onRenameCommit={workspace.saveName}
              onEdit={isPhone ? null : workspace.startEditing}
              onRemove={workspace.remove}
            />
          )}

          {isPhone && !collection.isEmpty && (
            <DesktopOnlyNote>To add a field or change its boundary, open this site on a computer.</DesktopOnlyNote>
          )}
        </div>
      </aside>

      <main
        className={clsx(
          'relative',
          isPhone ? 'h-44 shrink-0' : 'min-h-[55dvh] flex-1',
          isPhone && collection.isEmpty && 'hidden',
        )}
      >
        {workspace.status !== 'loading' && (
          <FieldMap
            baseLayer={BASE_LAYERS[baseLayerId]}
            draft={draft}
            isDrawing={tool !== 'select'}
            readOnly={isPhone}
            frame={current?.shape.bounds ?? null}
            startAt={current?.shape.bounds ?? null}
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
            onSavedSelect={select}
            renderFieldLabel={renderFieldLabel}
          />
        )}
        {!isPhone && (
          <MapToolbar
            baseLayerId={baseLayerId}
            isLocating={geolocation.status === 'locating'}
            onBaseLayerChange={setBaseLayerId}
            onLocate={() => void locateUser()}
          />
        )}
        {showsFirstFieldTitle && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-1000 flex justify-center px-3">
            <p className="flex items-center gap-2 rounded-full bg-zinc-950/80 px-4 py-2 text-base/6 font-semibold text-white shadow-xl backdrop-blur">
              <PencilIcon className="size-5 text-emerald-400" aria-hidden="true" />
              Outline one crop
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-1000 flex flex-col items-center gap-2 px-3">
          {mapHint && (
            <p className="flex items-center gap-2 rounded-full bg-zinc-950/85 px-4 py-1.5 text-sm/6 font-medium text-white shadow-lg backdrop-blur">
              <BackhandIndexPointingDown className="size-5 shrink-0" aria-hidden="true" />
              {mapHint}
            </p>
          )}
          {!isPhone && (
            <DrawingToolbar
              tool={tool}
              onToolChange={changeTool}
              vertexCount={draft.vertices.length}
              isPolygonClosed={draft.isPolygonClosed}
              canClosePolygon={selection.canClosePolygon}
              areaHectares={shape?.areaHectares ?? null}
              isEditing={isEditing}
              canSave={shape !== null && !isResolving && !workspace.isSaving && workspace.status === 'ready'}
              onUndo={selection.undoVertex}
              onFinish={selection.closePolygon}
              onClear={selection.clear}
              onSave={saveDrawing}
              onCancel={cancelDrawing}
            />
          )}
        </div>
      </main>
    </div>
  )
}
