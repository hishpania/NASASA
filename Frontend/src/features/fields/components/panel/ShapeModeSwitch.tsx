import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'
import { PencilIcon, ViewfinderCircleIcon } from '@heroicons/react/16/solid'
import type { ShapeMode } from '../../model/shape'

const MODE_OPTIONS: readonly SegmentedOption<ShapeMode>[] = [
  { value: 'polygon', label: 'Polygon', icon: PencilIcon },
  { value: 'radius', label: 'Radius', icon: ViewfinderCircleIcon },
]

type ShapeModeSwitchProps = {
  value: ShapeMode
  onChange: (mode: ShapeMode) => void
}

export function ShapeModeSwitch({ value, onChange }: ShapeModeSwitchProps) {
  return <SegmentedControl aria-label="Selection mode" value={value} options={MODE_OPTIONS} onChange={onChange} />
}
