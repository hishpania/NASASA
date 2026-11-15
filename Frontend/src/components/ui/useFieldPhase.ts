import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

export type FieldPhase = 0 | 1 | 2

export const FIELD_PHASES = 3

export function useFieldPhase(intervalMs = 2600) {
  const reduceMotion = useReducedMotion() ?? false
  const [phase, setPhase] = useState<FieldPhase>(reduceMotion ? 2 : 0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduceMotion || paused) {
      return
    }
    const timer = window.setInterval(
      () => setPhase((current) => ((current + 1) % FIELD_PHASES) as FieldPhase),
      intervalMs,
    )
    return () => window.clearInterval(timer)
  }, [reduceMotion, paused, intervalMs])

  const choose = (next: FieldPhase) => {
    setPhase(next)
    setPaused(true)
  }

  return { phase, choose, resume: () => setPaused(false), animated: !reduceMotion }
}
