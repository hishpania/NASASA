import { Button } from '@/components/catalyst/button'
import { useIsPhone } from '@/lib/useIsPhone'
import { PlusIcon } from '@heroicons/react/16/solid'
import { DesktopOnlyNote } from './DesktopOnlyNote'
import { FieldIllustration } from './FieldIllustration'
import { useFieldPhase } from './useFieldPhase'

type NoFieldStateProps = {
  title: string
  description: string
}

export function NoFieldState({ title, description }: NoFieldStateProps) {
  const { phase, animated } = useFieldPhase()
  const isPhone = useIsPhone()

  return (
    <div className="overflow-hidden">
      <FieldIllustration phase={phase} animated={animated} className="h-60" />
      <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
        <p className="text-base/6 font-semibold text-zinc-950 dark:text-white">{title}</p>
        <p className="max-w-md text-sm/6 text-zinc-500 dark:text-zinc-400">{description}</p>
        {isPhone ? (
          <div className="mt-2">
            <DesktopOnlyNote>Fields are drawn on a computer. Open this site there to add one.</DesktopOnlyNote>
          </div>
        ) : (
          <Button color="emerald" href="/" className="mt-2">
            <PlusIcon data-slot="icon" />
            Add field
          </Button>
        )}
      </div>
    </div>
  )
}
