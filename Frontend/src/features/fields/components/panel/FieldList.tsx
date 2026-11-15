import { Button } from '@/components/catalyst/button'
import { formatHectares } from '@/lib/format'
import * as Headless from '@headlessui/react'
import {
  ArrowRightIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  PencilIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { useState } from 'react'
import type { Field, FieldCollection } from '../../model/collection'
import { formatPlace } from '../../model/place'

type FieldListProps = {
  collection: FieldCollection
  activeId: string | null
  analyseHref: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onRenameCommit: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}

/** The saved fields as a plain pick list; rarely used actions live in each row's menu. */
export function FieldList({ collection, activeId, analyseHref, onSelect, ...actions }: FieldListProps) {
  return (
    <ul className="space-y-1.5">
      {collection.entries.map((entry) => (
        <FieldRow
          key={entry.id}
          entry={entry}
          isActive={entry.id === activeId}
          analyseHref={analyseHref}
          onSelect={() => onSelect(entry.id)}
          onRename={(name) => actions.onRename(entry.id, name)}
          onRenameCommit={() => actions.onRenameCommit(entry.id)}
          onEdit={() => actions.onEdit(entry.id)}
          onRemove={() => actions.onRemove(entry.id)}
        />
      ))}
    </ul>
  )
}

type FieldRowProps = {
  entry: Field
  isActive: boolean
  analyseHref: string
  onSelect: () => void
  onRename: (name: string) => void
  onRenameCommit: () => void
  onEdit: () => void
  onRemove: () => void
}

function FieldRow({
  entry,
  isActive,
  analyseHref,
  onSelect,
  onRename,
  onRenameCommit,
  onEdit,
  onRemove,
}: FieldRowProps) {
  const { name, place, shape } = entry
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameBefore, setNameBefore] = useState(name)

  const finishRenaming = () => {
    setIsRenaming(false)
    if (name.trim() === '') {
      onRename(nameBefore)
    } else if (name !== nameBefore) {
      onRenameCommit()
    }
  }

  return (
    <li
      className={clsx(
        'rounded-xl ring-1 transition',
        isActive
          ? 'bg-zinc-950/4 ring-zinc-950/15 dark:bg-white/5 dark:ring-white/20'
          : 'ring-transparent hover:bg-zinc-950/2.5 dark:hover:bg-white/5',
      )}
    >
      <div className="flex items-center gap-2 p-2 pl-3">
        <MapPinIcon
          className={clsx('size-4 shrink-0', isActive ? 'text-zinc-950 dark:text-white' : 'text-zinc-400')}
          aria-hidden="true"
        />
        {isRenaming ? (
          <input
            aria-label="Field name"
            autoFocus
            value={name}
            onChange={(event) => onRename(event.target.value)}
            onBlur={finishRenaming}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              } else if (event.key === 'Escape') {
                onRename(nameBefore)
                setIsRenaming(false)
              }
            }}
            className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm/6 font-medium text-zinc-950 ring-1 ring-zinc-950/15 focus:outline-2 focus:outline-blue-500 dark:bg-zinc-800 dark:text-white dark:ring-white/15"
          />
        ) : (
          <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left focus:outline-hidden">
            <span className="block truncate text-sm/6 font-medium text-zinc-950 dark:text-white">{name}</span>
            <span className="block truncate text-xs/5 text-zinc-500 dark:text-zinc-400">
              <span className="tabular-nums">{formatHectares(shape.areaHectares)}</span>
              {place && ` · ${formatPlace(place)}`}
            </span>
          </button>
        )}

        <Headless.Menu>
          <Headless.MenuButton
            aria-label={`More actions for ${name}`}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-hidden data-focus:outline-2 data-focus:outline-blue-500 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <EllipsisHorizontalIcon className="size-4" />
          </Headless.MenuButton>
          <Headless.MenuItems
            anchor={{ to: 'bottom end', gap: 4 }}
            transition
            className="z-50 w-44 rounded-xl bg-white p-1 shadow-lg ring-1 ring-zinc-950/10 transition duration-100 focus:outline-hidden data-closed:opacity-0 dark:bg-zinc-800 dark:ring-white/10"
          >
            <MenuAction
              icon={PencilIcon}
              label="Rename"
              onClick={() => {
                setNameBefore(name)
                setIsRenaming(true)
              }}
            />
            <MenuAction icon={PencilSquareIcon} label="Edit boundary" onClick={onEdit} />
            <MenuAction icon={TrashIcon} label="Delete" onClick={onRemove} destructive />
          </Headless.MenuItems>
        </Headless.Menu>
      </div>

      {isActive && !isRenaming && (
        <div className="px-2 pb-2">
          <Button color="emerald" href={analyseHref} className="w-full">
            Analyse field
            <ArrowRightIcon data-slot="icon" />
          </Button>
        </div>
      )}
    </li>
  )
}

type MenuActionProps = {
  icon: typeof PencilIcon
  label: string
  onClick: () => void
  destructive?: boolean
}

function MenuAction({ icon: Icon, label, onClick, destructive = false }: MenuActionProps) {
  return (
    <Headless.MenuItem>
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm/6 data-focus:bg-zinc-950/5 dark:data-focus:bg-white/10',
          destructive ? 'text-red-600 dark:text-red-400' : 'text-zinc-950 dark:text-white',
        )}
      >
        <Icon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
        {label}
      </button>
    </Headless.MenuItem>
  )
}
