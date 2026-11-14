export type LabelVariant = 'full' | 'compact'

export type LabelCandidate = {
  id: string
  center: { x: number; y: number }
  width: number
  height: number
  priority: number
}

type Rect = { left: number; top: number; right: number; bottom: number }

export const LABEL_SIZES: Record<LabelVariant, { width: number; height: number }> = {
  full: { width: 320, height: 116 },
  compact: { width: 170, height: 36 },
}

const GAP = 8
const COMPACT_MIN_SIZE = 24

function rectAround(center: { x: number; y: number }, { width, height }: { width: number; height: number }): Rect {
  return {
    left: center.x - width / 2 - GAP,
    top: center.y - height / 2 - GAP,
    right: center.x + width / 2 + GAP,
    bottom: center.y + height / 2 + GAP,
  }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

function preferredVariants({ width, height }: LabelCandidate): LabelVariant[] {
  if (width >= LABEL_SIZES.full.width * 0.8 && height >= LABEL_SIZES.full.height) {
    return ['full', 'compact']
  }
  return Math.max(width, height) >= COMPACT_MIN_SIZE ? ['compact'] : []
}

export function layoutLabels(candidates: readonly LabelCandidate[]): Map<string, LabelVariant> {
  const placed: Rect[] = []
  const layout = new Map<string, LabelVariant>()

  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority)) {
    for (const variant of preferredVariants(candidate)) {
      const rect = rectAround(candidate.center, LABEL_SIZES[variant])
      if (!placed.some((other) => overlaps(rect, other))) {
        placed.push(rect)
        layout.set(candidate.id, variant)
        break
      }
    }
  }

  return layout
}
