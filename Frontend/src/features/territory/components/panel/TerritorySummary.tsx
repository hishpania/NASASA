import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { formatCoordinates, formatHectares } from '@/lib/format'
import { formatPlace, type Place } from '../../model/place'
import type { Territory } from '../../model/territory'

type TerritorySummaryProps = {
  territory: Territory | null
  place: Place | null
  isResolvingPlace: boolean
}

export function TerritorySummary({ territory, place, isResolvingPlace }: TerritorySummaryProps) {
  if (!territory) {
    return null
  }

  return (
    <DescriptionList>
      <DescriptionTerm>Area</DescriptionTerm>
      <DescriptionDetails className="tabular-nums">{formatHectares(territory.areaHectares)}</DescriptionDetails>
      <DescriptionTerm>Center</DescriptionTerm>
      <DescriptionDetails className="tabular-nums">{formatCoordinates(territory.center)}</DescriptionDetails>
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
