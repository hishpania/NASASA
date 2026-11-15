import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { Field, FieldCollection } from '../model/collection'

export type FieldsStatus = 'loading' | 'ready' | 'failed'

/** The user's fields and the one the whole app is looking at. */
export type FieldsContextValue = {
  collection: FieldCollection
  setCollection: Dispatch<SetStateAction<FieldCollection>>
  status: FieldsStatus
  loadError: string | null
  /** The current field: every page shows this one. Null only when there are no fields yet. */
  current: Field | null
  select: (id: string) => void
}

export const FieldsContext = createContext<FieldsContextValue | null>(null)
