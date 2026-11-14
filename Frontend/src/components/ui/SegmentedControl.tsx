import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}

type SegmentedControlProps<T extends string> = {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  'aria-label': string
  variant?: 'muted' | 'floating'
}

const VARIANT_CLASSES = {
  muted: 'bg-zinc-950/5 dark:bg-white/5',
  floating: 'bg-white/90 shadow-sm ring-1 ring-zinc-950/10 backdrop-blur dark:bg-zinc-900/90 dark:ring-white/10',
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = 'muted',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <Headless.RadioGroup
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className={clsx('grid auto-cols-fr grid-flow-col gap-1 rounded-lg p-1', VARIANT_CLASSES[variant])}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <Headless.Radio
          key={optionValue}
          value={optionValue}
          className={clsx(
            'flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap text-zinc-600 transition',
            'data-checked:bg-white data-checked:text-zinc-950 data-checked:shadow-sm data-hover:text-zinc-950',
            'focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-1 data-focus:outline-blue-500',
            'dark:text-zinc-400 dark:data-checked:bg-zinc-700 dark:data-checked:text-white dark:data-hover:text-white',
            'px-3 py-1.5 text-sm/6',
          )}
        >
          {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
          {label}
        </Headless.Radio>
      ))}
    </Headless.RadioGroup>
  )
}
