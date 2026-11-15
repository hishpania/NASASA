import { Button } from '@/components/catalyst/button'
import { MapIcon } from '@heroicons/react/16/solid'
import { useGuide } from '../hooks/useGuide'

/** Brings the guide back after it was hidden, while there are steps left. */
export function GuideToggle() {
  const { hidden, current, show } = useGuide()
  // Nothing left to guide through once every step is done.
  if (!hidden || current === null) {
    return null
  }
  return (
    <Button plain onClick={show}>
      <MapIcon data-slot="icon" />
      Guide
    </Button>
  )
}
