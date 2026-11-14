import { Button } from '@/components/catalyst/button'
import { Input } from '@/components/catalyst/input'
import { formatHectares } from '@/lib/format'
import { MagnifyingGlassIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { useRef } from 'react'
import type { Field } from '../../model/collection'
import { formatPlace } from '../../model/place'

type FieldListItemProps = {
  entry: Field
  isActive: boolean
  isEditing: boolean
  onActivate: () => void
  onRename: (name: string) => void
  onRenameCommit: () => void
  onFocus: () => void
  onEdit: () => void
  onRemove: () => void
}

export function FieldListItem({
  entry,
  isActive,
  isEditing,
  onActivate,
  onRename,
  onRenameCommit,
  onFocus,
  onEdit,
  onRemove,
}: FieldListItemProps) {
  const { name, place, shape } = entry
  const nameOnFocus = useRef(name)

  return (
    <li
      onClick={onActivate}
      className={clsx(
        'space-y-2 rounded-lg p-3 ring-1 transition',
        isActive ? 'bg-sky-50 ring-sky-500/40 dark:bg-sky-500/10' : 'ring-zinc-950/10 dark:ring-white/10',
      )}
    >
      <div className="flex items-center gap-2">
        <Input
          aria-label="Field name"
          value={name}
          onFocus={() => {
            nameOnFocus.current = name
          }}
          onChange={(event) => onRename(event.target.value)}
          onBlur={() => {
            if (name !== nameOnFocus.current) {
              onRenameCommit()
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
        />
        <Button plain aria-label="Show on map" onClick={onFocus}>
          <MagnifyingGlassIcon data-slot="icon" />
        </Button>
        <Button plain aria-label="Edit shape" onClick={onEdit} disabled={isEditing}>
          <PencilSquareIcon data-slot="icon" />
        </Button>
        <Button plain aria-label="Remove field" onClick={onRemove}>
          <TrashIcon data-slot="icon" />
        </Button>
      </div>
      <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
        {isEditing && 'Editing · '}
        <span className="tabular-nums">{formatHectares(shape.areaHectares)}</span>
        {place && ` · ${formatPlace(place)}`}
      </p>
    </li>
  )
}
