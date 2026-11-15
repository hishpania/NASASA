import { createContext } from 'react'
import type { GuideStep, StepId } from './steps'

export type Guide = {
  steps: readonly GuideStep[]
  done: ReadonlySet<StepId>
  /** The first step not done yet, or null when the user has walked the whole path. */
  current: GuideStep | null
  hidden: boolean
  complete: (id: StepId) => void
  hide: () => void
  show: () => void
}

export const GuideContext = createContext<Guide | null>(null)
