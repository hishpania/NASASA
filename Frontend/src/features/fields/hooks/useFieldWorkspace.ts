import { useCallback, useState } from 'react'
import type { Place } from '../model/place'
import { fieldApi } from '../services'
import { useFieldDraft } from './useFieldDraft'
import { useFields } from './useFields'

function describeError(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Something went wrong'
}

export function useFieldWorkspace() {
  const selection = useFieldDraft()
  const { shape, reset, load } = selection
  const { collection, setCollection, status, loadError, current, select } = useFields()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

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
          setCollection((entries) => entries.update(saved.id, saved))
          select(saved.id)
          setEditingId(null)
        } else {
          const saved = await fieldApi.create({ name: collection.nextDefaultName(), place, shape })
          setCollection((entries) => entries.add(saved))
          select(saved.id)
        }
        reset()
      })
    },
    [shape, editingId, collection, persist, reset, setCollection, select],
  )

  const startEditing = useCallback(
    (id: string) => {
      const entry = collection.find(id)
      if (entry) {
        load(entry.shape)
        setEditingId(id)
        select(id)
      }
    },
    [collection, load, select],
  )

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    reset()
  }, [reset])

  const remove = useCallback(
    (id: string) => {
      void persist(async () => {
        await fieldApi.remove(id)
        setCollection((entries) => entries.remove(id))
        if (editingId === id) {
          cancelEditing()
        }
      })
    },
    [editingId, cancelEditing, persist, setCollection],
  )

  const rename = useCallback(
    (id: string, name: string) => {
      setCollection((entries) => entries.update(id, { name }))
    },
    [setCollection],
  )

  const saveName = useCallback(
    (id: string) => {
      const entry = collection.find(id)
      if (!entry) {
        return
      }
      void persist(async () => {
        const saved = await fieldApi.update(id, entry)
        setCollection((entries) => entries.update(id, { name: saved.name }))
      })
    },
    [collection, persist, setCollection],
  )

  return {
    selection,
    collection,
    status,
    isSaving,
    error: error ?? loadError,
    activeId: current?.id ?? null,
    editingId,
    activate: select,
    commitDraft,
    startEditing,
    cancelEditing,
    remove,
    rename,
    saveName,
  }
}
