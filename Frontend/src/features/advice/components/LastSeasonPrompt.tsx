import { motion } from 'motion/react'
import type { LandUse } from '../model/advice'
import { CropIcon } from './CropIcon'

type LastSeasonPromptProps = {
  fieldName: string
  newestSeen: number | null
  landUses: readonly LandUse[]
  onAnswer: (crop: string | null) => void
}

/** Asked when satellites cannot tell what grew on the field: the rotation advice depends on it. */
export function LastSeasonPrompt({ fieldName, newestSeen, landUses, onAnswer }: LastSeasonPromptProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10"
    >
      <div>
        <h2 className="text-base/6 font-semibold text-zinc-950 dark:text-white">
          Last season’s crop on {fieldName}
        </h2>
        <p className="text-sm/6 text-zinc-600 dark:text-zinc-400">
          {newestSeen === null
            ? 'No satellite crop record for this location.'
            : `Satellite crop records for this location end in ${newestSeen}.`}{' '}
          Add the previous crop for rotation-aware recommendations.
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
        {landUses.map(({ id, name }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onAnswer(id)}
              className="flex h-full w-full flex-col items-center gap-1 rounded-xl bg-white p-2 text-center text-xs/4 font-medium text-zinc-700 ring-1 ring-zinc-950/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-zinc-950/25 dark:hover:ring-white/25 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10"
            >
              <CropIcon landUseId={id} className="size-8" />
              {name}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onAnswer(null)}
        className="text-sm/6 font-medium text-zinc-600 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      >
        Skip
      </button>
    </motion.section>
  )
}
