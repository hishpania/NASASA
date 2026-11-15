import { useEffect, useState } from 'react'
import type { OutlookSeries } from '../model/outlook'
import { forecastApi } from '../services/ForecastApi'

const RETRY_MS = 15_000

type OutlookState =
  | { status: 'preparing'; key: string; startedAt: number }
  | { status: 'loaded'; key: string; forecastDate: string; series: OutlookSeries[] }
  | { status: 'failed'; key: string; message: string }

export function useFieldOutlook(fieldId: string | null) {
  const key = fieldId ?? ''
  const [state, setState] = useState<OutlookState | null>(null)

  useEffect(() => {
    if (fieldId === null) {
      return
    }
    const controller = new AbortController()
    let retry: ReturnType<typeof setTimeout> | undefined
    const load = () =>
      forecastApi
        .outlookForField(fieldId, controller.signal)
        .then((outlook) => {
          if (outlook.status === 'ready') {
            setState({ status: 'loaded', key, forecastDate: outlook.forecastDate, series: outlook.series })
          } else {
            setState({ status: 'preparing', key, startedAt: Date.parse(outlook.startedAt) })
            retry = setTimeout(load, RETRY_MS)
          }
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setState({
              status: 'failed',
              key,
              message: reason instanceof Error ? reason.message : 'Request failed',
            })
          }
        })
    load()
    return () => {
      controller.abort()
      clearTimeout(retry)
    }
  }, [key, fieldId])

  if (fieldId === null) {
    return { status: 'idle' as const }
  }
  if (!state || state.key !== key) {
    return { status: 'loading' as const }
  }
  return state
}
