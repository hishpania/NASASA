import { useEffect, useState } from 'react'
import type { Advice, AdviceOptions } from '../model/advice'
import { adviceApi } from '../services/AdviceApi'

type AdviceState =
  | { status: 'loaded'; key: string; advice: Advice }
  | { status: 'failed'; key: string; message: string }

export function useFieldAdvice(fieldId: string | null, { previousCrop, irrigated }: AdviceOptions) {
  const key = fieldId === null ? '' : `${fieldId}:${previousCrop ?? ''}:${irrigated}`
  const [state, setState] = useState<AdviceState | null>(null)

  useEffect(() => {
    if (fieldId === null) {
      return
    }
    const controller = new AbortController()
    adviceApi
      .forField(fieldId, { previousCrop, irrigated }, controller.signal)
      .then((advice) => setState({ status: 'loaded', key, advice }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'failed',
            key,
            message: reason instanceof Error ? reason.message : 'Request failed',
          })
        }
      })
    return () => controller.abort()
  }, [key, fieldId, previousCrop, irrigated])

  if (fieldId === null) {
    return { status: 'idle' as const }
  }
  if (!state || state.key !== key) {
    // The previous answer stays on screen while options change, so the page does not jump.
    return { status: 'loading' as const, previous: state?.status === 'loaded' ? state.advice : null }
  }
  return state
}
