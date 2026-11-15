import { useContext } from 'react'
import { FieldsContext, type FieldsContextValue } from '../context/fieldsContext'

export function useFields(): FieldsContextValue {
  const fields = useContext(FieldsContext)
  if (!fields) {
    throw new Error('useFields must be used inside FieldsProvider')
  }
  return fields
}
