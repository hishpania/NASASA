import { Button } from '@/components/catalyst/button'
import { ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import type { GeolocationError } from '../../services'

type GeolocationNoticeProps = {
  error: GeolocationError
  onRetry: () => void
}

export function GeolocationNotice({ error, onRetry }: GeolocationNoticeProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:ring-amber-500/20">
      <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p className="flex-1 text-sm/6 text-amber-800 dark:text-amber-200">{error.message}</p>
      {error.reason !== 'unsupported' && error.reason !== 'denied' && (
        <Button plain onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
