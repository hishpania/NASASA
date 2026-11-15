import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'

const TONES = {
  positive: { icon: CheckCircleIcon, className: 'text-green-600 dark:text-green-400' },
  caution: { icon: ExclamationTriangleIcon, className: 'text-amber-600 dark:text-amber-400' },
  neutral: { icon: InformationCircleIcon, className: 'text-zinc-400 dark:text-zinc-500' },
}

type NoteListProps = {
  notes: readonly string[]
  tone: keyof typeof TONES
}

export function NoteList({ notes, tone }: NoteListProps) {
  if (notes.length === 0) {
    return null
  }
  const { icon: Icon, className } = TONES[tone]

  return (
    <ul className="space-y-1.5">
      {notes.map((note) => (
        <li key={note} className="flex items-start gap-2 text-sm/6 text-zinc-700 dark:text-zinc-300">
          <Icon className={clsx('mt-1 size-4 shrink-0', className)} aria-hidden="true" />
          <span>{note}</span>
        </li>
      ))}
    </ul>
  )
}
