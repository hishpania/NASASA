import type { Field, FieldDetails } from '../../model/collection'
import { normalizeLatLng, type LatLng } from '../../model/geo'
import type { Place } from '../../model/place'
import { PolygonShape, RadiusShape, type ShapeMode } from '../../model/shape'

export type PlaceDto = Omit<Place, 'description'> & { description: string | null }

export type FieldPayload = {
  name: string
  mode: ShapeMode
  areaHectares: number
  radiusMeters: number | null
  center: LatLng
  points: LatLng[]
  place: PlaceDto | null
}

export type FieldDto = FieldPayload & {
  id: number
  created: string
  lastModified: string
}

export function toField(dto: FieldDto): Field {
  const shape =
    dto.mode === 'radius' && dto.radiusMeters !== null
      ? new RadiusShape(dto.center, dto.radiusMeters)
      : new PolygonShape(dto.points)

  return {
    id: String(dto.id),
    name: dto.name,
    place: dto.place ? { ...dto.place, description: dto.place.description ?? '' } : null,
    shape,
  }
}

export function toPayload({ name, place, shape }: FieldDetails): FieldPayload {
  return {
    name,
    mode: shape.mode,
    areaHectares: shape.areaHectares,
    radiusMeters: shape instanceof RadiusShape ? shape.radiusMeters : null,
    center: normalizeLatLng(shape.center),
    points: shape.points.map(normalizeLatLng),
    place: place ? { ...place, point: normalizeLatLng(place.point) } : null,
  }
}
