import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { describeFit, formatShare, type FitLevel, type Recommendation } from '../model/advice'
import { CropIcon } from './CropIcon'
import { MoreDetails } from './MoreDetails'
import { NoteList } from './NoteList'
import { SeasonBar } from './SeasonBar'

/** Colour marks the verdict with a dot; the text beside it stays neutral. */
const FIT_DOTS: Record<FitLevel['tone'], string> = {
  great: 'bg-green-500',
  good: 'bg-lime-500',
  fair: 'bg-amber-500',
  poor: 'bg-red-500',
}

type RecommendationCardProps = {
  rank: number
  recommendation: Recommendation
}

export function RecommendationCard({ rank, recommendation }: RecommendationCardProps) {
  const { crop, score, probability, sowing, reasons, cautions } = recommendation
  const fit = describeFit(score)
  const isTopPick = rank === 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(rank, 8) * 0.05 }}
      className={clsx(
        'flex flex-col gap-4 rounded-xl bg-white p-5 dark:bg-zinc-900',
        isTopPick ? 'ring-1 ring-zinc-950/20 dark:ring-white/25' : 'ring-1 ring-zinc-950/5 dark:ring-white/10',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-950/5 dark:bg-white/5 dark:ring-white/10">
          <CropIcon landUseId={crop.id} className="size-9" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base/6 font-semibold text-zinc-950 dark:text-white">{crop.name}</h3>
            {isTopPick && (
              <span className="rounded-full bg-emerald-600 px-2 text-xs/5 font-medium text-white">
                Best pick
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-sm/6 font-medium text-zinc-700 dark:text-zinc-300">
            <span className={clsx('size-2 rounded-full', FIT_DOTS[fit.tone])} aria-hidden="true" />
            {fit.label} <span className="text-zinc-400 tabular-nums dark:text-zinc-500">· {formatShare(score)}</span>
          </p>
        </div>
        <span className="self-start text-sm/6 font-medium text-zinc-300 tabular-nums dark:text-zinc-600">#{rank}</span>
      </div>

      <div
        role="meter"
        aria-label={`${crop.name} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(score * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/10"
      >
        <motion.div
          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(score * 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {sowing && <SeasonBar sowing={sowing} />}

      {probability !== null && probability >= 0.01 && (
        <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
          Planted next on {formatShare(probability)} of similar fields
        </p>
      )}

      {(reasons.length > 0 || cautions.length > 0) && (
        <MoreDetails
          className="mt-auto border-t border-zinc-950/5 pt-3 dark:border-white/5"
          label={
            <span className="flex items-center gap-3">
              Why
              {reasons.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircleIcon className="size-4 text-green-600 dark:text-green-500" aria-hidden="true" />
                  {reasons.length}
                </span>
              )}
              {cautions.length > 0 && (
                <span className="flex items-center gap-1">
                  <ExclamationTriangleIcon className="size-4 text-amber-500" aria-hidden="true" />
                  {cautions.length}
                </span>
              )}
            </span>
          }
        >
          <NoteList notes={reasons} tone="positive" />
          <NoteList notes={cautions} tone="caution" />
        </MoreDetails>
      )}
    </motion.article>
  )
}
