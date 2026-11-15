export type StepId = 'field' | 'history' | 'advice'

export type GuideStep = {
  id: StepId
  title: string
  hint: string
  href: string
  action: string
}

/** The path a new user walks: draw a field, add last season's crop, review recommendations. */
export const STEPS: readonly GuideStep[] = [
  {
    id: 'field',
    title: 'Select a field to analyse',
    hint: 'Search for a location and draw the field boundary with the tools below the map.',
    href: '/',
    action: 'Open map',
  },
  {
    id: 'history',
    title: 'Add last season’s crop',
    hint: 'Crop history drives rotation-aware recommendations.',
    href: '/advice',
    action: 'Add crop',
  },
  {
    id: 'advice',
    title: 'Review recommendations',
    hint: 'Ranked crops, sowing windows and three-year rotation plans for your field.',
    href: '/advice',
    action: 'View recommendations',
  },
]
