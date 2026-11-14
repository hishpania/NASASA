import type { TerritoryEntry, TerritoryEntryDetails } from '../../model/collection'
import type { LatLng } from '../../model/geo'
import type { Place } from '../../model/place'
import { PolygonTerritory, RadiusTerritory, type SelectionMode } from '../../model/territory'

export type PlaceDto = Omit<Place, 'description'> & { description: string | null }

export type TerritoryPayload = {
  name: string
  mode: SelectionMode
  areaHectares: number
  radiusMeters: number | null
  center: LatLng
  points: LatLng[]
  place: PlaceDto | null
}

export type TerritoryDto = TerritoryPayload & {
  id: number
  created: string
  lastModified: string
}

export function toEntry(dto: TerritoryDto): TerritoryEntry {
  const territory =
    dto.mode === 'radius' && dto.radiusMeters !== null
      ? new RadiusTerritory(dto.center, dto.radiusMeters)
      : new PolygonTerritory(dto.points)

  return {
    id: String(dto.id),
    name: dto.name,
    place: dto.place ? { ...dto.place, description: dto.place.description ?? '' } : null,
    territory,
  }
}

export function toPayload({ name, place, territory }: TerritoryEntryDetails): TerritoryPayload {
  return {
    name,
    mode: territory.mode,
    areaHectares: territory.areaHectares,
    radiusMeters: territory instanceof RadiusTerritory ? territory.radiusMeters : null,
    center: territory.center,
    points: [...territory.points],
    place,
  }
}
