import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'
import { PencilIcon, ViewfinderCircleIcon } from '@heroicons/react/16/solid'
import type { SelectionMode } from '../../model/territory'

const MODE_OPTIONS: readonly SegmentedOption<SelectionMode>[] = [
  { value: 'polygon', label: 'Polygon', icon: PencilIcon },
  { value: 'radius', label: 'Radius', icon: ViewfinderCircleIcon },
]

type SelectionModeSwitchProps = {
  value: SelectionMode
  onChange: (mode: SelectionMode) => void
}

export function SelectionModeSwitch({ value, onChange }: SelectionModeSwitchProps) {
  return <SegmentedControl aria-label="Selection mode" value={value} options={MODE_OPTIONS} onChange={onChange} />
}
