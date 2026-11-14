import { Button } from '@/components/catalyst/button'
import { Field, Label } from '@/components/catalyst/fieldset'
import { Input } from '@/components/catalyst/input'
import { RADIUS_LIMITS } from '@/config/map'
import { formatDistance } from '@/lib/format'
import { TrashIcon } from '@heroicons/react/16/solid'
import { useState, type KeyboardEvent } from 'react'

type RadiusControlsProps = {
  hasCenter: boolean
  radiusMeters: number
  onRadiusChange: (radiusMeters: number) => void
  onClear: () => void
}

export function RadiusControls({ hasCenter, radiusMeters, onRadiusChange, onClear }: RadiusControlsProps) {
  const [pendingValue, setPendingValue] = useState<string | null>(null)

  const commitPendingValue = () => {
    if (pendingValue !== null) {
      onRadiusChange(Number(pendingValue))
      setPendingValue(null)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitPendingValue()
    }
  }

  return (
    <div className="space-y-4">
      <Field>
        <div className="flex items-baseline justify-between">
          <Label>Radius</Label>
          <span className="text-sm/6 font-medium text-zinc-950 tabular-nums dark:text-white">
            {formatDistance(radiusMeters)}
          </span>
        </div>
        <input
          type="range"
          aria-label="Radius slider"
          min={RADIUS_LIMITS.min}
          max={RADIUS_LIMITS.max}
          step={RADIUS_LIMITS.step}
          value={radiusMeters}
          onChange={(event) => onRadiusChange(Number(event.target.value))}
          className="mt-3 w-full accent-amber-500"
        />
      </Field>
      <Field>
        <Label>Exact radius, meters</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={RADIUS_LIMITS.min}
          max={RADIUS_LIMITS.max}
          value={pendingValue ?? radiusMeters}
          onChange={(event) => setPendingValue(event.target.value)}
          onBlur={commitPendingValue}
          onKeyDown={handleKeyDown}
        />
      </Field>
      <Button plain onClick={onClear} disabled={!hasCenter}>
        <TrashIcon data-slot="icon" />
        Clear
      </Button>
    </div>
  )
}
