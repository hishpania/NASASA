import { formatHectares } from '@/lib/format'
import * as Headless from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, MapPinIcon, PlusIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { useNavigate } from 'react-router'
import { useFields } from '../hooks/useFields'
import { formatPlace } from '../model/place'

const ADD_NEW = '__add_new__'

/** The one place to choose the field the whole app is working on. */
export function FieldSwitcher() {
  const { collection, status, current, select } = useFields()
  const navigate = useNavigate()

  if (status === 'loading') {
    return <div className="h-10 w-48 animate-pulse rounded-lg bg-zinc-950/5 dark:bg-white/5" aria-hidden="true" />
  }
  if (current === null) {
    return (
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-950/20 px-3 py-1.5 text-sm/6 font-medium text-zinc-600 hover:border-zinc-950/40 hover:text-zinc-950 dark:border-white/20 dark:text-zinc-300 dark:hover:border-white/40 dark:hover:text-white"
      >
        <PlusIcon className="size-4" aria-hidden="true" />
        Add field
      </button>
    )
  }

  const choose = (id: string) => {
    if (id === ADD_NEW) {
      navigate('/')
    } else {
      select(id)
    }
  }

  return (
    <Headless.Listbox value={current.id} onChange={choose}>
      <Headless.ListboxButton
        aria-label="Current field"
        className="flex max-w-72 min-w-0 items-center gap-2 rounded-lg bg-white py-1 pr-2 pl-2.5 text-left shadow-xs ring-1 ring-zinc-950/10 hover:ring-zinc-950/20 focus:outline-hidden data-focus:outline-2 data-focus:outline-blue-500 dark:bg-zinc-800 dark:ring-white/10 dark:hover:ring-white/20"
      >
        <MapPinIcon className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm/5 font-semibold text-zinc-950 dark:text-white">{current.name}</span>
          <span className="block truncate text-[11px]/4 text-zinc-500 tabular-nums dark:text-zinc-400">
            {formatHectares(current.shape.areaHectares)}
            {current.place && ` · ${formatPlace(current.place)}`}
          </span>
        </span>
        <ChevronUpDownIcon className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
      </Headless.ListboxButton>
      <Headless.ListboxOptions
        anchor={{ to: 'bottom start', gap: 6 }}
        transition
        className="z-1100 max-h-96 w-80 overflow-y-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-zinc-950/10 transition duration-100 focus:outline-hidden data-closed:opacity-0 dark:bg-zinc-800 dark:ring-white/10"
      >
        <p className="px-2.5 pt-1.5 pb-1 text-xs/5 font-medium text-zinc-500 dark:text-zinc-400">My fields</p>
        {collection.entries.map((field) => (
          <Headless.ListboxOption
            key={field.id}
            value={field.id}
            className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 select-none data-focus:bg-zinc-950/5 dark:data-focus:bg-white/10"
          >
            <MapPinIcon className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">{field.name}</span>
              <span className="block truncate text-xs/4 text-zinc-500 tabular-nums dark:text-zinc-400">
                {formatHectares(field.shape.areaHectares)}
                {field.place && ` · ${formatPlace(field.place)}`}
              </span>
            </span>
            <CheckIcon className="invisible size-4 shrink-0 text-zinc-950 group-data-selected:visible dark:text-white" />
          </Headless.ListboxOption>
        ))}
        <div className="my-1 h-px bg-zinc-950/5 dark:bg-white/10" />
        <Headless.ListboxOption
          value={ADD_NEW}
          className={clsx(
            'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm/6 font-medium text-zinc-950 select-none',
            'data-focus:bg-zinc-950/5 dark:text-white dark:data-focus:bg-white/10',
          )}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          Add field
        </Headless.ListboxOption>
      </Headless.ListboxOptions>
    </Headless.Listbox>
  )
}
