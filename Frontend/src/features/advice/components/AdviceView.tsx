import { Badge } from '@/components/catalyst/badge'
import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { Notice } from '@/components/ui/Notice'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useFields } from '@/features/fields'
import { useGuide } from '@/features/guide'
import { ChevronRightIcon } from '@heroicons/react/16/solid'
import { motion } from 'motion/react'
import { Fragment, useEffect, useMemo, useState, type ComponentProps } from 'react'
import CloudWithRain from '~icons/fluent-emoji-flat/cloud-with-rain'
import Droplet from '~icons/fluent-emoji-flat/droplet'
import Sun from '~icons/fluent-emoji-flat/sun'
import TestTube from '~icons/fluent-emoji-flat/test-tube'
import Thermometer from '~icons/fluent-emoji-flat/thermometer'
import { useFieldAdvice } from '../hooks/useFieldAdvice'
import { useReportedCrop } from '../hooks/useReportedCrop'
import type { Advice } from '../model/advice'
import { emphasizedIndicators, PRIORITIES, rankStrategies, type Priority } from '../model/priority'
import { AdviceLoading } from './AdviceLoading'
import { ClimateTile } from './ClimateTile'
import { CropIcon } from './CropIcon'
import { LastSeasonPrompt } from './LastSeasonPrompt'
import { MoreDetails } from './MoreDetails'
import { NoteList } from './NoteList'
import { OptionPicker, type PickerOption } from './OptionPicker'
import { RecommendationCard } from './RecommendationCard'
import { StrategyCard } from './StrategyCard'
import { NoFieldState } from '@/components/ui/NoFieldState'

const WATER_OPTIONS = [
  { value: 'rainfed', label: 'Rainfed' },
  { value: 'irrigated', label: 'Irrigated' },
] as const

type WaterSupply = (typeof WATER_OPTIONS)[number]['value']

/** Last-season picker values that are not crops. */
const NOT_ASKED = ''
const UNKNOWN = 'unknown'

const PANEL = 'rounded-xl bg-white p-6 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10'

function soilTile({ soil, climate }: Advice): ComponentProps<typeof ClimateTile> {
  if (soil?.ph != null) {
    return {
      icon: TestTube,
      label: 'Soil acidity',
      value: soil.ph.toFixed(1),
      unit: 'pH',
      hint: [soil.drainage, soil.name].filter(Boolean).join(' · ') || 'From the soil survey',
      explanation:
        'Most field crops perform best between pH 6.0 and 7.5; outside that range nutrient uptake declines.',
    }
  }
  return {
    icon: Droplet,
    label: 'Soil moisture',
    value: climate.soilWetness === null ? '—' : String(Math.round(climate.soilWetness * 100)),
    unit: climate.soilWetness === null ? undefined : '%',
    hint: climate.soilWetness === null ? 'No soil data for this point' : 'Root zone, warm season',
    explanation:
      'Root-zone soil wetness over the warm season from NASA satellite data: 0% is completely dry, 100% is saturated.',
  }
}

export function AdviceView() {
  const { current: field, status: fieldsStatus } = useFields()
  const [waterSupply, setWaterSupply] = useState<WaterSupply>('rainfed')
  const [priority, setPriority] = useState<Priority>('balanced')

  const [reportedCrop, setReportedCrop] = useReportedCrop(field?.id ?? null)
  const result = useFieldAdvice(field?.id ?? null, {
    previousCrop: reportedCrop ?? null,
    irrigated: waterSupply === 'irrigated',
  })
  const advice = result.status === 'loaded' ? result.advice : result.status === 'loading' ? result.previous : null
  const strategies = useMemo(() => (advice ? rankStrategies(advice.strategies, priority) : []), [advice, priority])
  const emphasized = useMemo(() => emphasizedIndicators(priority), [priority])
  const asksLastSeason =
    result.status === 'loaded' && result.advice.history.length === 0 && reportedCrop === undefined

  const { complete: completeStep } = useGuide()
  const knowsHistory = result.status === 'loaded' && !asksLastSeason
  useEffect(() => {
    if (knowsHistory) {
      completeStep('history')
    }
  }, [knowsHistory, completeStep])
  // Recommendations count as reviewed only once the crop history behind them is settled.
  const showsAdvice = knowsHistory && result.advice.recommendations.length > 0
  useEffect(() => {
    if (showsAdvice) {
      completeStep('advice')
    }
  }, [showsAdvice, completeStep])

  if (fieldsStatus === 'loading') {
    return <div className={`${PANEL} text-sm/6 text-zinc-500 dark:text-zinc-400`}>Loading fields…</div>
  }
  if (field === null) {
    return (
      <NoFieldState
        title="Add a field to get recommendations"
        description="Recommendations are built per field. Outline yours on the map to see which crops fit it and three-year rotation plans."
      />
    )
  }

  const lastSeasonOptions: PickerOption[] = [
    {
      value: NOT_ASKED,
      label: advice?.provider.kind === 'model' ? 'As seen by satellite' : 'Not set',
      icon: <CropIcon landUseId="other_crop" className="size-5" />,
    },
    { value: UNKNOWN, label: 'I don’t know', icon: <CropIcon landUseId="non_crop" className="size-5" /> },
    ...(advice?.landUses ?? []).map(({ id, name }) => ({
      value: id,
      label: name,
      icon: <CropIcon landUseId={id} className="size-5" />,
    })),
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs/5 font-medium text-zinc-500 dark:text-zinc-400">Water</span>
          <SegmentedControl
            aria-label="Water supply"
            options={WATER_OPTIONS}
            value={waterSupply}
            onChange={setWaterSupply}
          />
        </div>
        <OptionPicker
          label="Last season"
          value={reportedCrop === undefined ? NOT_ASKED : (reportedCrop ?? UNKNOWN)}
          onChange={(value) => setReportedCrop(value === NOT_ASKED ? undefined : value === UNKNOWN ? null : value)}
          options={lastSeasonOptions}
          className="w-64"
        />
      </div>

      {asksLastSeason && (
        <LastSeasonPrompt fieldName={field.name} landUses={result.advice.landUses} onAnswer={setReportedCrop} />
      )}

      {result.status === 'failed' && (
        <Notice>Could not build crop advice: {result.message}</Notice>
      )}

      {result.status === 'loading' && !advice && <AdviceLoading fieldName={field.name} />}

      {advice && (
        <div className="relative space-y-10">
          {result.status === 'loading' && <UpdatingBar />}
          <div className={result.status === 'loading' ? 'space-y-10 opacity-50 transition' : 'space-y-10 transition'}>
            <AdviceContent
              advice={advice}
              priority={priority}
              onPriorityChange={setPriority}
              strategies={strategies}
              emphasized={emphasized}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Shown over the previous answer while a new one is on its way, so the page does not jump. */
function UpdatingBar() {
  return (
    <div
      role="status"
      aria-label="Updating advice"
      className="absolute inset-x-0 -top-5 h-1 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10"
    >
      <motion.div
        className="h-full w-1/3 rounded-full bg-zinc-800 dark:bg-zinc-200"
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

type AdviceContentProps = {
  advice: Advice
  priority: Priority
  onPriorityChange: (priority: Priority) => void
  strategies: ReturnType<typeof rankStrategies>
  emphasized: ReturnType<typeof emphasizedIndicators>
}

function AdviceContent({ advice, priority, onPriorityChange, strategies, emphasized }: AdviceContentProps) {
  const { climate, history, provider } = advice
  const newest = history[0]?.year
  const firstYear = (newest ?? new Date().getFullYear()) + 1

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Subheading>Field conditions</Subheading>
          {history.length > 0 && (
            <ol aria-label="Past seasons, oldest first" className="flex flex-wrap items-center gap-1">
              {[...history].reverse().map((season, index, seasons) => (
                <Fragment key={index}>
                  {index > 0 && (
                    <ChevronRightIcon className="size-3.5 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
                  )}
                  <li
                    className="flex items-center gap-1.5 rounded-full bg-zinc-950/5 py-0.5 pr-2.5 pl-1 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300"
                    title={season.origin === 'reported' ? 'Reported by you' : 'Seen by satellite'}
                  >
                    <CropIcon landUseId={season.landUse.id} className="size-4" />
                    {season.year !== null && <span className="text-zinc-400 tabular-nums">{season.year}</span>}
                    {season.landUse.name}
                    {index === seasons.length - 1 && seasons.length > 1 && (
                      <span className="text-zinc-400">· last</span>
                    )}
                  </li>
                </Fragment>
              ))}
            </ol>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClimateTile
            icon={Sun}
            label="Warm season"
            value={String(climate.growingDays)}
            unit="days a year"
            hint="Mean temperature of 5 °C or more"
            explanation={
              <div className="space-y-2">
                <p>Days with a mean temperature of 5 °C or more, when field crops can grow.</p>
                <p>
                  Heat sum: <strong className="font-semibold">{Math.round(climate.growingDegreeDays)} °C·d</strong>.
                  Growing degree days above 10 °C. Each crop needs a set heat sum to reach maturity; a higher total
                  supports longer-season crops such as corn.
                </p>
              </div>
            }
          />
          <ClimateTile
            icon={CloudWithRain}
            label="Season rainfall"
            value={String(Math.round(climate.seasonPrecipitation))}
            unit="mm"
            hint={`${Math.round(climate.annualPrecipitation)} mm annually`}
            explanation="Rainfall over the six warmest months, when crop water demand peaks. Low totals point to drought-tolerant crops or irrigation."
          />
          <ClimateTile
            icon={Thermometer}
            label="Season temperature"
            value={climate.seasonTemperature.toFixed(1)}
            unit="°C"
            hint="Average of the 6 warmest months"
            explanation="Cool-season crops such as wheat, barley and peas perform best around 12–22 °C; warm-season crops such as corn, soybeans and cotton need more heat."
          />
          <ClimateTile {...soilTile(advice)} />
        </div>
      </section>

      <section className="space-y-4">
        <Subheading>Recommended crops</Subheading>
        {advice.recommendations.length === 0 ? (
          <div className={PANEL}>
            <Text>No crop in the catalogue fits this climate under rainfed conditions. Try the irrigated option.</Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {advice.recommendations.map((recommendation, index) => (
              <RecommendationCard key={recommendation.crop.id} rank={index + 1} recommendation={recommendation} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Subheading>Rotation plans</Subheading>
            <Text className="mt-1">Three-year rotations, ranked by your priority.</Text>
          </div>
          <SegmentedControl aria-label="Priority" options={PRIORITIES} value={priority} onChange={onPriorityChange} />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              emphasized={emphasized}
              firstYear={firstYear}
              past={strategy.isCurrent ? history.slice(0, 2).reverse() : []}
            />
          ))}
        </div>
      </section>

      <MoreDetails label="Methodology and data sources" className={PANEL}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm/6 font-medium text-zinc-950 dark:text-white">{provider.name}</span>
          <Badge color="zinc">
            {provider.kind === 'model' ? 'Machine-learning model' : 'Agronomic rules'}
          </Badge>
        </div>
        <Text>{provider.description}</Text>
        <NoteList notes={advice.gaps} tone="neutral" />
        <Text>
          Data: {climate.source}
          {advice.soil && `; ${advice.soil.source}`}. Recommendations support, and do not replace, agronomic judgement.
        </Text>
      </MoreDetails>
    </>
  )
}
