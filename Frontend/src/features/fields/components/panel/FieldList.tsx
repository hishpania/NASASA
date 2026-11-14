import { Badge } from '@/components/catalyst/badge'
import { formatHectares } from '@/lib/format'
import type { FieldCollection } from '../../model/collection'
import { FieldListItem } from './FieldListItem'

type FieldListProps = {
  collection: FieldCollection
  activeId: string | null
  editingId: string | null
  onActivate: (id: string) => void
  onRename: (id: string, name: string) => void
  onRenameCommit: (id: string) => void
  onFocus: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}

export function FieldList({
  collection,
  activeId,
  editingId,
  onActivate,
  onRename,
  onRenameCommit,
  onFocus,
  onEdit,
  onRemove,
}: FieldListProps) {
  if (collection.isEmpty) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge color="sky">{collection.size} selected</Badge>
        <span className="text-sm/6 font-medium text-zinc-950 tabular-nums dark:text-white">
          Total {formatHectares(collection.totalAreaHectares)}
        </span>
      </div>
      <ul className="space-y-2">
        {collection.entries.map((entry) => (
          <FieldListItem
            key={entry.id}
            entry={entry}
            isActive={entry.id === activeId}
            isEditing={entry.id === editingId}
            onActivate={() => onActivate(entry.id)}
            onRename={(name) => onRename(entry.id, name)}
            onRenameCommit={() => onRenameCommit(entry.id)}
            onFocus={() => onFocus(entry.id)}
            onEdit={() => onEdit(entry.id)}
            onRemove={() => onRemove(entry.id)}
          />
        ))}
      </ul>
    </div>
  )
}
