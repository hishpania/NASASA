import * as Headless from '@headlessui/react'
import { QuestionMarkCircleIcon } from '@heroicons/react/16/solid'
import type { ComponentType, ReactNode, SVGProps } from 'react'

type ClimateTileProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  unit?: string
  hint: string
  /** Plain-language explanation shown behind the question mark. */
  explanation: ReactNode
}

export function ClimateTile({ icon: Icon, label, value, unit, hint, explanation }: ClimateTileProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl bg-white p-5 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <Icon className="size-10 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">{label}</p>
          <Headless.Popover className="relative">
            <Headless.PopoverButton
              aria-label={`What is “${label}”?`}
              className="grid size-6 place-items-center rounded-full text-zinc-400 hover:text-zinc-700 focus:outline-hidden data-focus:outline-2 data-focus:outline-blue-500 dark:text-zinc-500 dark:hover:text-zinc-200"
            >
              <QuestionMarkCircleIcon className="size-4" aria-hidden="true" />
            </Headless.PopoverButton>
            <Headless.PopoverPanel
              anchor={{ to: 'bottom', gap: 8 }}
              transition
              className="z-50 w-72 rounded-xl bg-white p-4 text-sm/6 text-zinc-700 shadow-lg ring-1 ring-zinc-950/10 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-white/10"
            >
              {explanation}
            </Headless.PopoverPanel>
          </Headless.Popover>
        </div>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl/8 font-semibold text-zinc-950 tabular-nums dark:text-white">{value}</span>
          {unit && <span className="text-sm/6 text-zinc-500 dark:text-zinc-400">{unit}</span>}
        </p>
        <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">{hint}</p>
      </div>
    </div>
  )
}
