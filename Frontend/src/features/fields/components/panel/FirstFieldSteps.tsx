import type { ComponentType, SVGProps } from 'react'
import CheckMarkButton from '~icons/fluent-emoji-flat/check-mark-button'
import MagnifyingGlass from '~icons/fluent-emoji-flat/magnifying-glass-tilted-left'
import Pencil from '~icons/fluent-emoji-flat/pencil'

const STEPS: readonly { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; hint: string }[] = [
  { icon: MagnifyingGlass, title: 'Find your land', hint: 'Search above or press My location' },
  { icon: Pencil, title: 'Click around the field edges', hint: 'Each click adds a corner on the map' },
  { icon: CheckMarkButton, title: 'Close the shape and Save', hint: 'Click the first point, then Save' },
]

export function FirstFieldSteps() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-950/15 p-4 dark:border-white/15">
      <p className="mb-4 text-sm/6 font-semibold text-zinc-950 dark:text-white">How to start</p>
      <ol className="grid gap-4">
        {STEPS.map(({ icon: Icon, title, hint }, index) => (
          <li key={title} className="relative flex items-start gap-3">
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-11 bottom-[-0.75rem] left-5 w-px bg-zinc-950/10 dark:bg-white/10"
              />
            )}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-950/5 dark:bg-white/10">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <span className="grid pt-0.5">
              <span className="text-sm/5 font-medium text-zinc-950 dark:text-white">
                {index + 1}. {title}
              </span>
              <span className="text-xs/5 text-zinc-500 dark:text-zinc-400">{hint}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
