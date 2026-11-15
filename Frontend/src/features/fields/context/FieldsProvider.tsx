import { useAuth } from '@/features/auth'
import { localStore } from '@/lib/storage'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FieldCollection } from '../model/collection'
import { fieldApi } from '../services'
import { FieldsContext, type FieldsContextValue, type FieldsStatus } from './fieldsContext'

/** Loads the fields once for the whole app and remembers which one the user is working on. */
export function FieldsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const storageKey = `neosphere.currentField.${session?.user.id ?? 'anonymous'}`
  const [collection, setCollection] = useState(FieldCollection.EMPTY)
  const [status, setStatus] = useState<FieldsStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() => localStore.read<string>(storageKey))

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
          setLoadError(reason instanceof Error ? reason.message : 'Could not load your fields')
          setStatus('failed')
        }
      })
    return () => controller.abort()
  }, [])

  const select = useCallback(
    (id: string) => {
      setSelectedId(id)
      localStore.write(storageKey, id)
    },
    [storageKey],
  )

  const value = useMemo<FieldsContextValue>(
    () => ({
      collection,
      setCollection,
      status,
      loadError,
      // A deleted or foreign id falls back to the first field, so there is always one in context.
      current: (selectedId === null ? undefined : collection.find(selectedId)) ?? collection.entries[0] ?? null,
      select,
    }),
    [collection, status, loadError, selectedId, select],
  )

  return <FieldsContext.Provider value={value}>{children}</FieldsContext.Provider>
}
