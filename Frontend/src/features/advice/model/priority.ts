import type { RotationStrategy, StrategyIndicators } from './advice'

export type Indicator = keyof StrategyIndicators

export const INDICATORS: readonly { key: Indicator; label: string; hint: string }[] = [
  { key: 'climateFit', label: 'Climate fit', hint: 'How well the crops match local temperature and water' },
  { key: 'waterBalance', label: 'Water balance', hint: 'Share of crop water need met by rain and soil moisture' },
  { key: 'nitrogen', label: 'Nitrogen', hint: 'Legumes in the rotation that fix nitrogen' },
  { key: 'diversity', label: 'Diversity', hint: 'Different crop families across the rotation' },
  { key: 'pestBreak', label: 'Pest break', hint: 'Years that respect the break each crop needs' },
  { key: 'soilCover', label: 'Soil cover', hint: 'Years with residue-rich or overwintering crops' },
]

export const PRIORITIES = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'water', label: 'Save water' },
  { value: 'soil', label: 'Build soil' },
  { value: 'erosion', label: 'Stop erosion' },
] as const

export type Priority = (typeof PRIORITIES)[number]['value']

const PRIORITY_INDICATORS: Record<Priority, readonly Indicator[]> = {
  balanced: INDICATORS.map(({ key }) => key),
  water: ['waterBalance', 'climateFit'],
  soil: ['nitrogen', 'diversity', 'pestBreak'],
  erosion: ['soilCover', 'diversity'],
}

export function priorityScore(strategy: RotationStrategy, priority: Priority): number {
  const indicators = PRIORITY_INDICATORS[priority]
  return indicators.reduce((total, key) => total + strategy.indicators[key], 0) / indicators.length
}

export function emphasizedIndicators(priority: Priority): ReadonlySet<Indicator> {
  return new Set(priority === 'balanced' ? [] : PRIORITY_INDICATORS[priority])
}

/** The current rotation stays first as the baseline; the alternatives follow, best for the priority first. */
export function rankStrategies(strategies: readonly RotationStrategy[], priority: Priority): RotationStrategy[] {
  const current = strategies.filter((strategy) => strategy.isCurrent)
  const alternatives = strategies
    .filter((strategy) => !strategy.isCurrent)
    .sort((a, b) => priorityScore(b, priority) - priorityScore(a, priority))
  return [...current, ...alternatives]
}
