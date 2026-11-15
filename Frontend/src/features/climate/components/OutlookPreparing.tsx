import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { ArrowPathIcon } from '@heroicons/react/16/solid'
import { useEffect, useState } from 'react'

const BAR_HEIGHTS = [70, 55, 80, 60, 75, 50, 65, 85, 55, 70, 60, 75]

function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function OutlookPreparing({ startedAt }: { startedAt: number | null }) {
  const training = startedAt !== null
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick, 1000)
    tick()
    return () => clearInterval(timer)
  }, [])

  const seconds = startedAt !== null && now !== null ? Math.max(0, Math.round((now - startedAt) / 1000)) : null

  return (
    <section
      aria-busy
      className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ArrowPathIcon className="mt-1 size-4 shrink-0 animate-spin fill-zinc-500 dark:fill-zinc-400" />
          <div>
            <Subheading>{training ? 'Training the outlook for this region' : 'Loading the outlook'}</Subheading>
            {training && (
              <Text className="mt-1">
                Learning from NASA POWER since 1981 and NASA GEOS-S2S forecasts.
                <br />
                The first run takes about 4 minutes. The charts appear here when it is done.
              </Text>
            )}
          </div>
        </div>
        {seconds !== null && (
          <span className="text-sm/6 text-zinc-500 tabular-nums dark:text-zinc-400">{formatElapsed(seconds)}</span>
        )}
      </div>
      <div className="mt-6 flex h-32 items-end gap-1 sm:gap-2">
        {BAR_HEIGHTS.map((height, index) => (
          <div
            key={index}
            className="flex-1 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5"
            style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
    </section>
  )
}
