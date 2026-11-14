import type { LatLng } from '@/features/fields'
import { useEffect, useMemo, useState } from 'react'
import { toSnapshot, type ClimateSnapshot } from '../model/snapshot'
import { nasaPower } from '../services/NasaPowerApi'

const SNAPSHOT_DAYS = 14

const cache = new Map<string, Promise<ClimateSnapshot | null>>()

function cacheKey({ lat, lng }: LatLng): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

function loadSnapshot(point: LatLng): Promise<ClimateSnapshot | null> {
  const key = cacheKey(point)
  let pending = cache.get(key)
  if (!pending) {
    pending = nasaPower
      .daily(point, SNAPSHOT_DAYS)
      .then((series) => toSnapshot(series.days))
      .catch(() => {
        cache.delete(key)
        return null
      })
    cache.set(key, pending)
  }
  return pending
}

function parseSignature(signature: string): { id: string; point: LatLng }[] {
  if (signature === '') {
    return []
  }
  return signature.split('|').map((entry) => {
    const [id, coordinates] = entry.split('@')
    const [lat, lng] = coordinates.split(',').map(Number)
    return { id, point: { lat, lng } }
  })
}

export function useClimateSnapshots(points: readonly { id: string; point: LatLng }[]) {
  const signature = points.map(({ id, point }) => `${id}@${cacheKey(point)}`).join('|')
  const targets = useMemo(() => parseSignature(signature), [signature])
  const [snapshots, setSnapshots] = useState<ReadonlyMap<string, ClimateSnapshot>>(new Map())

  useEffect(() => {
    let isCurrent = true
    Promise.all(targets.map(async ({ id, point }) => [id, await loadSnapshot(point)] as const)).then((entries) => {
      if (isCurrent) {
        setSnapshots(new Map(entries.filter((entry): entry is readonly [string, ClimateSnapshot] => entry[1] !== null)))
      }
    })
    return () => {
      isCurrent = false
    }
  }, [targets])

  return snapshots
}
