import { useEffect, useState } from 'react'
import type { ClimateForecast } from '../model/forecast'
import { forecastApi } from '../services/ForecastApi'

type ForecastState =
  | { status: 'loaded'; key: string; forecast: ClimateForecast }
  | { status: 'failed'; key: string; message: string }

export function useFieldForecast(fieldId: string | null) {
  const key = fieldId ?? ''
  const [state, setState] = useState<ForecastState | null>(null)

  useEffect(() => {
    if (fieldId === null) {
      return
    }
    const controller = new AbortController()
    forecastApi
      .forField(fieldId, controller.signal)
      .then((forecast) => setState({ status: 'loaded', key, forecast }))
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
  }, [key, fieldId])

  if (fieldId === null) {
    return { status: 'idle' as const }
  }
  if (!state || state.key !== key) {
    return { status: 'loading' as const }
  }
  return state
}
