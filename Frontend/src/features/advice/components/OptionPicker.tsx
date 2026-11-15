import * as Headless from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export type PickerOption = {
  value: string
  label: string
  description?: string
  icon?: ReactNode
}

type OptionPickerProps = {
  label: string
  value: string
  options: readonly PickerOption[]
  onChange: (value: string) => void
  className?: string
}

/** A labelled dropdown whose options can carry an icon and a second line. */
export function OptionPicker({ label, value, options, onChange, className }: OptionPickerProps) {
  const selected = options.find((option) => option.value === value) ?? options[0]

  return (
    <Headless.Field className={clsx('flex min-w-0 flex-col gap-1', className)}>
      <Headless.Label className="text-xs/5 font-medium text-zinc-500 dark:text-zinc-400">{label}</Headless.Label>
      <Headless.Listbox value={value} onChange={onChange}>
        <Headless.ListboxButton className="flex w-full items-center gap-2.5 rounded-lg bg-white py-2 pr-2 pl-3 text-left text-sm/6 text-zinc-950 shadow-xs ring-1 ring-zinc-950/10 hover:ring-zinc-950/20 focus:outline-hidden data-focus:outline-2 data-focus:outline-blue-500 dark:bg-zinc-800 dark:text-white dark:ring-white/10 dark:hover:ring-white/20">
          {selected?.icon}
          <span className="min-w-0 flex-1 truncate font-medium">{selected?.label}</span>
          {selected?.description && (
            <span className="shrink-0 text-xs/5 text-zinc-500 tabular-nums dark:text-zinc-400">
              {selected.description}
            </span>
          )}
          <ChevronUpDownIcon className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
        </Headless.ListboxButton>
        <Headless.ListboxOptions
          anchor={{ to: 'bottom start', gap: 4 }}
          transition
          className="z-50 max-h-80 w-(--button-width) min-w-56 overflow-y-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-zinc-950/10 transition duration-100 focus:outline-hidden data-closed:opacity-0 dark:bg-zinc-800 dark:ring-white/10"
        >
          {options.map((option) => (
            <Headless.ListboxOption
              key={option.value}
              value={option.value}
              className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm/6 text-zinc-950 select-none data-focus:bg-zinc-950/5 dark:text-white dark:data-focus:bg-white/10"
            >
              {option.icon}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.description && (
                <span className="shrink-0 text-xs/5 text-zinc-500 tabular-nums dark:text-zinc-400">
                  {option.description}
                </span>
              )}
              <CheckIcon className="invisible size-4 shrink-0 text-zinc-950 group-data-selected:visible dark:text-white" />
            </Headless.ListboxOption>
          ))}
        </Headless.ListboxOptions>
      </Headless.Listbox>
    </Headless.Field>
  )
}
