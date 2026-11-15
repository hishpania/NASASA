import { FieldIllustration } from '@/components/ui/FieldIllustration'
import { useFieldPhase, type FieldPhase } from '@/components/ui/useFieldPhase'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'
import CheckMarkButton from '~icons/fluent-emoji-flat/check-mark-button'
import MagnifyingGlass from '~icons/fluent-emoji-flat/magnifying-glass-tilted-left'
import Pencil from '~icons/fluent-emoji-flat/pencil'

const STEPS: readonly { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; hint: string }[] = [
  { icon: MagnifyingGlass, title: 'Find your land', hint: 'Search above or press My location' },
  { icon: Pencil, title: 'Outline one crop', hint: 'Click around the part sown with a single crop' },
  { icon: CheckMarkButton, title: 'Close the shape and Save', hint: 'Click the first point, then Save' },
]

export function FirstFieldSteps() {
  const { phase, choose, resume, animated } = useFieldPhase()

  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-zinc-950/15 dark:border-white/15">
      <FieldIllustration phase={phase} animated={animated} compact className="aspect-[12/7] w-full" />
      <div className="p-4 pt-1" onMouseLeave={resume}>
        <p className="mb-3 text-sm/6 font-semibold text-zinc-950 dark:text-white">How to start</p>
        <ol className="grid gap-3">
          {STEPS.map(({ icon: Icon, title, hint }, index) => {
            const isMuted = animated && phase !== index
            return (
              <li key={title}>
                <button
                  type="button"
                  onClick={() => choose(index as FieldPhase)}
                  onMouseEnter={() => choose(index as FieldPhase)}
                  className={clsx(
                    'flex w-full items-start gap-3 text-left transition-opacity duration-300',
                    isMuted && 'opacity-45',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-950/5 dark:bg-white/10">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="grid pt-0.5">
                    <span className="text-sm/5 font-medium text-zinc-950 dark:text-white">
                      {index + 1}. {title}
                    </span>
                    <span className="text-xs/5 text-zinc-500 dark:text-zinc-400">{hint}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 border-t border-zinc-950/10 pt-3 text-xs/5 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          One field is one crop. If neighbouring plots grow different crops, add each one as its own field, not the
          whole farm at once.
        </p>
      </div>
    </div>
  )
}
