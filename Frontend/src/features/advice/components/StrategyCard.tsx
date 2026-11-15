import { Badge } from '@/components/catalyst/badge'
import { ChevronRightIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { Fragment } from 'react'
import type { LandUse, RotationStrategy, Season } from '../model/advice'
import { INDICATORS, type Indicator } from '../model/priority'
import { CropIcon } from './CropIcon'
import { MoreDetails } from './MoreDetails'
import { NoteList } from './NoteList'
import { ScoreMeter } from './ScoreMeter'

type StrategyCardProps = {
  strategy: RotationStrategy
  emphasized: ReadonlySet<Indicator>
  firstYear: number
  past: Season[]
}

export function StrategyCard({ strategy, emphasized, firstYear, past }: StrategyCardProps) {
  const { name, isCurrent, sequence, summary, indicators, evidence, benefits, risks } = strategy

  return (
    <article className="flex flex-col gap-5 rounded-xl bg-white p-5 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base/6 font-semibold text-zinc-950 dark:text-white">{name}</h3>
        {isCurrent && <Badge color="zinc">Current rotation</Badge>}
      </div>

      <ol aria-label="Crop sequence" className="flex items-start gap-1">
        {past.map((season, index) => (
          <Fragment key={`past-${index}`}>
            {index > 0 && <Arrow />}
            <SeasonTile landUse={season.landUse} caption={season.year ?? 'Last season'} muted />
          </Fragment>
        ))}
        {past.length > 0 && (
          <li aria-hidden="true" className="mx-1 h-12 w-px shrink-0 bg-zinc-950/10 dark:bg-white/10" />
        )}
        {sequence.map((landUse, year) => (
          <Fragment key={year}>
            {year > 0 && <Arrow />}
            <SeasonTile landUse={landUse} caption={firstYear + year} />
          </Fragment>
        ))}
      </ol>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {INDICATORS.map(({ key, label, hint }) => (
          <ScoreMeter key={key} label={label} hint={hint} value={indicators[key]} emphasized={emphasized.has(key)} />
        ))}
      </div>

      <MoreDetails label="Details" className="mt-auto border-t border-zinc-950/5 pt-3 dark:border-white/5">
        <p className="text-sm/6 text-zinc-600 dark:text-zinc-400">{summary}</p>
        <NoteList notes={benefits} tone="positive" />
        <NoteList notes={risks} tone="caution" />
        <NoteList notes={evidence} tone="neutral" />
      </MoreDetails>
    </article>
  )
}

function Arrow() {
  return <ChevronRightIcon className="mt-4 size-4 shrink-0 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
}

type SeasonTileProps = {
  landUse: LandUse
  caption: number | string
  muted?: boolean
}

function SeasonTile({ landUse, caption, muted = false }: SeasonTileProps) {
  return (
    <li className={clsx('flex min-w-0 flex-1 flex-col items-center gap-1 text-center', muted && 'opacity-50')}>
      <span className="grid size-12 place-items-center rounded-xl bg-zinc-50 ring-1 ring-zinc-950/5 dark:bg-white/5 dark:ring-white/10">
        <CropIcon landUseId={landUse.id} className="size-8" />
      </span>
      <span className="w-full truncate text-xs/4 text-zinc-700 dark:text-zinc-300">{landUse.name}</span>
      <span className="text-[10px]/3 text-zinc-400 tabular-nums dark:text-zinc-500">{caption}</span>
    </li>
  )
}
