import { localStore } from '@/lib/storage'
import { useCallback, useState } from 'react'

/**
 * What the farmer said grew on a field last season: a land use id, `null` for "I don't know",
 * or `undefined` when they have not been asked yet. Remembered per field in this browser.
 */
export type ReportedCrop = string | null | undefined

type StoredAnswer = { crop: string | null }

const storageKey = (fieldId: string) => `neosphere.lastSeason.${fieldId}`

function readAnswer(fieldId: string | null): ReportedCrop {
  return fieldId === null ? undefined : localStore.read<StoredAnswer>(storageKey(fieldId))?.crop
}

export function useReportedCrop(fieldId: string | null): [ReportedCrop, (answer: ReportedCrop) => void] {
  const [state, setState] = useState(() => ({ fieldId, answer: readAnswer(fieldId) }))
  // Switching fields reads that field's answer during render instead of in an effect.
  const current = state.fieldId === fieldId ? state : { fieldId, answer: readAnswer(fieldId) }
  if (current !== state) {
    setState(current)
  }

  const setAnswer = useCallback(
    (answer: ReportedCrop) => {
      if (fieldId === null) {
        return
      }
      if (answer === undefined) {
        localStore.remove(storageKey(fieldId))
      } else {
        localStore.write(storageKey(fieldId), { crop: answer } satisfies StoredAnswer)
      }
      setState({ fieldId, answer })
    },
    [fieldId],
  )

  return [current.answer, setAnswer]
}
