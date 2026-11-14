import { Button } from '@/components/catalyst/button'
import { CheckIcon, PlusIcon } from '@heroicons/react/16/solid'

type DraftActionsProps = {
  isEditing: boolean
  canCommit: boolean
  onCommit: () => void
  onCancel: () => void
}

export function DraftActions({ isEditing, canCommit, onCommit, onCancel }: DraftActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button color="amber" onClick={onCommit} disabled={!canCommit}>
        {isEditing ? <CheckIcon data-slot="icon" /> : <PlusIcon data-slot="icon" />}
        {isEditing ? 'Save changes' : 'Add to selection'}
      </Button>
      {isEditing && (
        <Button plain onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  )
}
