import { ExclamationCircleIcon } from '@heroicons/react/16/solid'

export function WorkspaceNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:ring-red-500/20">
      <ExclamationCircleIcon className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
      <p className="flex-1 text-sm/6 text-red-800 dark:text-red-200">{message}</p>
    </div>
  )
}
