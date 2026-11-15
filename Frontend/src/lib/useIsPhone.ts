import { useSyncExternalStore } from 'react'

const PHONE_QUERY = '(pointer: coarse) and (max-width: 1023px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(PHONE_QUERY).matches
}

export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
