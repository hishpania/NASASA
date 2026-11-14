import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { formatCoordinates, formatHectares } from '@/lib/format'
import { formatPlace, type Place } from '../../model/place'
import type { Shape } from '../../model/shape'

type FieldSummaryProps = {
  shape: Shape | null
  place: Place | null
  isResolvingPlace: boolean
}

export function FieldSummary({ shape, place, isResolvingPlace }: FieldSummaryProps) {
  if (!shape) {
    return null
  }

  return (
    <DescriptionList>
      <DescriptionTerm>Area</DescriptionTerm>
      <DescriptionDetails className="tabular-nums">{formatHectares(shape.areaHectares)}</DescriptionDetails>
      <DescriptionTerm>Center</DescriptionTerm>
      <DescriptionDetails className="tabular-nums">{formatCoordinates(shape.center)}</DescriptionDetails>
      <DescriptionTerm>Location</DescriptionTerm>
      <DescriptionDetails>{describeLocation(place, isResolvingPlace)}</DescriptionDetails>
    </DescriptionList>
  )
}

function describeLocation(place: Place | null, isResolving: boolean): string {
  if (isResolving) {
    return 'Resolving…'
  }
  return place ? formatPlace(place) : 'Unknown'
}
