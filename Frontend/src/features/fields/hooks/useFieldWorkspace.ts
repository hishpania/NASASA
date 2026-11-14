import { useCallback, useEffect, useState } from 'react'
import { FieldCollection } from '../model/collection'
import type { Place } from '../model/place'
import { fieldApi } from '../services'
import { useFieldDraft } from './useFieldDraft'

export type WorkspaceStatus = 'loading' | 'ready' | 'failed'

function describeError(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Something went wrong'
}

export function useFieldWorkspace() {
  const selection = useFieldDraft()
  const { shape, reset, load } = selection
  const [collection, setCollection] = useState(FieldCollection.EMPTY)
  const [status, setStatus] = useState<WorkspaceStatus>('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fieldApi
      .list(controller.signal)
      .then((entries) => {
        setCollection(FieldCollection.of(entries))
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(describeError(reason))
          setStatus('failed')
        }
      })
    return () => controller.abort()
  }, [])

  const persist = useCallback(async (operation: () => Promise<void>) => {
    setIsSaving(true)
    setError(null)
    try {
      await operation()
    } catch (reason) {
      setError(describeError(reason))
    } finally {
      setIsSaving(false)
    }
  }, [])

  const commitDraft = useCallback(
    (place: Place | null) => {
      if (!shape) {
        return
      }
      const editingEntry = editingId ? collection.find(editingId) : undefined
      void persist(async () => {
        if (editingEntry) {
          const saved = await fieldApi.update(editingEntry.id, { name: editingEntry.name, place, shape })
          setCollection((current) => current.update(saved.id, saved))
          setActiveId(saved.id)
          setEditingId(null)
        } else {
          const saved = await fieldApi.create({ name: collection.nextDefaultName(), place, shape })
          setCollection((current) => current.add(saved))
          setActiveId(saved.id)
        }
        reset()
      })
    },
    [shape, editingId, collection, persist, reset],
  )

  const startEditing = useCallback(
    (id: string) => {
      const entry = collection.find(id)
      if (entry) {
        load(entry.shape)
        setEditingId(id)
        setActiveId(id)
      }
    },
    [collection, load],
  )

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    reset()
  }, [reset])

  const remove = useCallback(
    (id: string) => {
      void persist(async () => {
        await fieldApi.remove(id)
        setCollection((current) => current.remove(id))
        setActiveId((current) => (current === id ? null : current))
        if (editingId === id) {
          cancelEditing()
        }
      })
    },
    [editingId, cancelEditing, persist],
  )

  const rename = useCallback((id: string, name: string) => {
    setCollection((current) => current.update(id, { name }))
  }, [])

  const saveName = useCallback(
    (id: string) => {
      const entry = collection.find(id)
      if (!entry) {
        return
      }
      void persist(async () => {
        const saved = await fieldApi.update(id, entry)
        setCollection((current) => current.update(id, { name: saved.name }))
      })
    },
    [collection, persist],
  )

  return {
    selection,
    collection,
    status,
    isSaving,
    error,
    activeId,
    editingId,
    activate: setActiveId,
    commitDraft,
    startEditing,
    cancelEditing,
    remove,
    rename,
    saveName,
  }
}
