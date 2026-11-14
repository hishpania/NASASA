export const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const

export const CHART_THEME = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  surface: 'var(--chart-surface)',
  cursor: 'var(--chart-cursor)',
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
} as const
