import * as Headless from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ReactNode } from 'react'

type MoreDetailsProps = {
  label: ReactNode
  children: ReactNode
  className?: string
}

/** Keeps the long explanations one click away, so the cards stay short. */
export function MoreDetails({ label, children, className }: MoreDetailsProps) {
  return (
    <Headless.Disclosure as="div" className={className}>
      <Headless.DisclosureButton className="group flex items-center gap-1.5 rounded-md text-sm/6 font-medium text-zinc-600 hover:text-zinc-950 focus:outline-hidden data-focus:outline-2 data-focus:outline-blue-500 dark:text-zinc-400 dark:hover:text-white">
        {label}
        <ChevronDownIcon className="size-4 transition group-data-open:rotate-180" aria-hidden="true" />
      </Headless.DisclosureButton>
      <Headless.DisclosurePanel
        transition
        className={clsx(
          'mt-3 space-y-3 origin-top transition duration-200 ease-out',
          'data-closed:-translate-y-1 data-closed:opacity-0',
        )}
      >
        {children}
      </Headless.DisclosurePanel>
    </Headless.Disclosure>
  )
}
