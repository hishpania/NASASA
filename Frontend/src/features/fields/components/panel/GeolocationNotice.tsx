import { Button } from '@/components/catalyst/button'
import { ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import type { GeolocationError } from '../../services'

type GeolocationNoticeProps = {
  error: GeolocationError
  onRetry: () => void
}

export function GeolocationNotice({ error, onRetry }: GeolocationNoticeProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-zinc-950/3 p-3 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:ring-white/10">
      <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
      <p className="flex-1 text-sm/6 text-zinc-700 dark:text-zinc-300">{error.message}</p>
      {error.reason !== 'unsupported' && error.reason !== 'denied' && (
        <Button plain onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
