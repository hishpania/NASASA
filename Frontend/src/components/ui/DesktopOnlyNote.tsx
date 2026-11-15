import { ComputerDesktopIcon } from '@heroicons/react/16/solid'

export function DesktopOnlyNote({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-3 text-left ring-1 ring-amber-500/30 dark:bg-amber-400/10 dark:ring-amber-400/25">
      <ComputerDesktopIcon className="mt-1 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p className="flex-1 text-sm/6 text-zinc-700 dark:text-zinc-300">{children}</p>
    </div>
  )
}
