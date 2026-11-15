import { ExclamationCircleIcon } from '@heroicons/react/16/solid'
import type { ReactNode } from 'react'

/** A neutral message panel; only the icon carries the colour. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg bg-zinc-950/3 p-3 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:ring-white/10"
    >
      <ExclamationCircleIcon className="mt-1 size-4 shrink-0 text-red-500" aria-hidden="true" />
      <p className="flex-1 text-sm/6 text-zinc-700 dark:text-zinc-300">{children}</p>
    </div>
  )
}
