import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useEffect, useState } from 'react'
import type { LatLng } from '../model/geo'
import { geocoder, type Place } from '../services'

const REVERSE_DEBOUNCE_MS = 600

type ReverseState = {
  key: string
  place: Place | null
}

export function useReverseGeocode(point: LatLng | null) {
  const key = point ? `${point.lat.toFixed(5)},${point.lng.toFixed(5)}` : ''
  const debouncedKey = useDebouncedValue(key, REVERSE_DEBOUNCE_MS)
  const [result, setResult] = useState<ReverseState>({ key: '', place: null })

  useEffect(() => {
    if (!debouncedKey) {
      return
    }
    const [lat, lng] = debouncedKey.split(',').map(Number)
    const controller = new AbortController()
    geocoder
      .reverse({ lat, lng }, controller.signal)
      .then((place) => setResult({ key: debouncedKey, place }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key: debouncedKey, place: null })
        }
      })
    return () => controller.abort()
  }, [debouncedKey])

  return {
    place: key && result.key === key ? result.place : null,
    isResolving: Boolean(key) && result.key !== key,
  }
}
