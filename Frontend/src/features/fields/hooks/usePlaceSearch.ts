import { SEARCH_SETTINGS } from '@/config/map'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useEffect, useState } from 'react'
import type { LatLng } from '../model/geo'
import { geocoder, type Place } from '../services'

type SearchState = {
  query: string
  places: Place[]
  failed: boolean
}

export function usePlaceSearch(query: string, near?: LatLng | null) {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_SETTINGS.debounceMs)
  const [result, setResult] = useState<SearchState>({ query: '', places: [], failed: false })
  const isSearchable = debouncedQuery.length >= SEARCH_SETTINGS.minQueryLength

  useEffect(() => {
    if (!isSearchable) {
      return
    }
    const controller = new AbortController()
    geocoder
      .search(debouncedQuery, { signal: controller.signal, near: near ?? undefined, limit: SEARCH_SETTINGS.limit })
      .then((places) => setResult({ query: debouncedQuery, places, failed: false }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error)
          setResult({ query: debouncedQuery, places: [], failed: true })
        }
      })
    return () => controller.abort()
  }, [debouncedQuery, isSearchable, near])

  return {
    places: isSearchable ? result.places : [],
    isSearching: isSearchable && result.query !== debouncedQuery,
    failed: isSearchable && result.failed,
  }
}
