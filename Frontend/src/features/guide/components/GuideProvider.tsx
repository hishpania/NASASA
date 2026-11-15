import { useAuth } from '@/features/auth'
import { useFields } from '@/features/fields'
import { localStore } from '@/lib/storage'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { GuideContext, type Guide } from '../model/guideContext'
import { STEPS, type StepId } from '../model/steps'

type GuideState = { done: StepId[]; hidden: boolean }

const EMPTY: GuideState = { done: [], hidden: false }

/** Remembers, per user and browser, which getting-started steps are done and whether the guide is hidden. */
export function GuideProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const key = `neosphere.guide.${session?.user.id ?? 'anonymous'}`
  const [state, setState] = useState<GuideState>(() => localStore.read<GuideState>(key) ?? EMPTY)

  const update = useCallback(
    (change: (previous: GuideState) => GuideState) =>
      setState((previous) => {
        const next = change(previous)
        if (next !== previous) {
          localStore.write(key, next)
        }
        return next
      }),
    [key],
  )

  const complete = useCallback(
    (id: StepId) =>
      update((previous) => (previous.done.includes(id) ? previous : { ...previous, done: [...previous.done, id] })),
    [update],
  )
  const hide = useCallback(() => update((previous) => ({ ...previous, hidden: true })), [update])
  const show = useCallback(() => update((previous) => ({ ...previous, hidden: false })), [update])

  const { collection, status } = useFields()
  const hasField = !collection.isEmpty
  const fieldsKnown = status === 'ready'

  const guide = useMemo<Guide>(() => {
    const done = new Set<StepId>(fieldsKnown && !hasField ? [] : state.done)
    if (hasField) {
      done.add('field')
    }
    return {
      steps: STEPS,
      done,
      current: STEPS.find((step) => !done.has(step.id)) ?? null,
      hidden: state.hidden || status === 'loading',
      complete,
      hide,
      show,
    }
  }, [state, complete, hide, show, hasField, fieldsKnown, status])

  return <GuideContext.Provider value={guide}>{children}</GuideContext.Provider>
}
