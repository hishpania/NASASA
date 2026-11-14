import { Button } from '@/components/catalyst/button'
import { ArrowUturnLeftIcon, CheckIcon, TrashIcon } from '@heroicons/react/16/solid'

type PolygonControlsProps = {
  vertexCount: number
  canClose: boolean
  onUndo: () => void
  onClose: () => void
  onClear: () => void
}

export function PolygonControls({ vertexCount, canClose, onUndo, onClose, onClear }: PolygonControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button outline onClick={onUndo} disabled={vertexCount === 0}>
          <ArrowUturnLeftIcon data-slot="icon" />
          Undo
        </Button>
        <Button color="amber" onClick={onClose} disabled={!canClose}>
          <CheckIcon data-slot="icon" />
          Finish shape
        </Button>
        <Button plain onClick={onClear} disabled={vertexCount === 0}>
          <TrashIcon data-slot="icon" />
          Clear
        </Button>
      </div>
    </div>
  )
}

