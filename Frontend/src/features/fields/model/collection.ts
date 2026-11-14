import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { LatLng } from './geo'
import { formatPlace, type Address, type Place } from './place'
import type { ShapeMode, Shape } from './shape'

export type Field = {
  id: string
  name: string
  place: Place | null
  shape: Shape
}

export type FieldDetails = Omit<Field, 'id'>

export type ExportedGeocoding = Address & {
  label: string
  name: string
  point: LatLng
}

export type ExportedFieldProperties = {
  id: string
  name: string
  mode: ShapeMode
  areaHectares: number
  radiusMeters: number | null
  center: LatLng
  points: LatLng[]
  geocoding: ExportedGeocoding | null
}

export type ExportedFieldFeature = Feature<Polygon, ExportedFieldProperties>

export const DRAFT_ENTRY_ID = 'draft'

const COORDINATE_PRECISION = 6
const AREA_PRECISION = 4
const RADIUS_PRECISION = 2

function roundTo(value: number, digits: number): number {
  return Number(value.toFixed(digits))
}

function roundPoint({ lat, lng }: LatLng): LatLng {
  return { lat: roundTo(lat, COORDINATE_PRECISION), lng: roundTo(lng, COORDINATE_PRECISION) }
}

function roundGeometry(geometry: Polygon): Polygon {
  return {
    type: 'Polygon',
    coordinates: geometry.coordinates.map((ring) =>
      ring.map((position) => position.map((value) => roundTo(value, COORDINATE_PRECISION))),
    ),
  }
}

function exportGeocoding(place: Place | null): ExportedGeocoding | null {
  if (!place) {
    return null
  }
  return {
    label: formatPlace(place),
    name: place.name,
    point: roundPoint(place.point),
    ...place.address,
  }
}

function exportEntry({ id, name, place, shape }: Field): ExportedFieldFeature {
  const { properties, geometry } = shape.feature
  return {
    type: 'Feature',
    id,
    geometry: roundGeometry(geometry),
    properties: {
      id,
      name,
      mode: shape.mode,
      areaHectares: roundTo(shape.areaHectares, AREA_PRECISION),
      radiusMeters: properties.mode === 'radius' ? roundTo(properties.radiusMeters, RADIUS_PRECISION) : null,
      center: roundPoint(shape.center),
      points: shape.points.map(roundPoint),
      geocoding: exportGeocoding(place),
    },
  }
}

export class FieldCollection {
  static readonly EMPTY = new FieldCollection([])

  static of(entries: readonly Field[]): FieldCollection {
    return new FieldCollection(entries)
  }

  readonly entries: readonly Field[]

  private constructor(entries: readonly Field[]) {
    this.entries = entries
  }

  get size(): number {
    return this.entries.length
  }

  get isEmpty(): boolean {
    return this.entries.length === 0
  }

  get totalAreaHectares(): number {
    return this.entries.reduce((total, { shape }) => total + shape.areaHectares, 0)
  }

  find(id: string): Field | undefined {
    return this.entries.find((entry) => entry.id === id)
  }

  add(entry: Field): FieldCollection {
    return new FieldCollection([...this.entries, entry])
  }

  update(id: string, changes: Partial<FieldDetails>): FieldCollection {
    return new FieldCollection(this.entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))
  }

  remove(id: string): FieldCollection {
    return new FieldCollection(this.entries.filter((entry) => entry.id !== id))
  }

  withDraft(shape: Shape | null, place: Place | null, editingId: string | null): FieldCollection {
    if (!shape) {
      return this
    }
    if (editingId) {
      return this.update(editingId, { shape, place })
    }
    return this.add({ id: DRAFT_ENTRY_ID, name: this.nextDefaultName(), place, shape })
  }

  nextDefaultName(): string {
    return `Field ${this.size + 1}`
  }

  toFeatureCollection(): FeatureCollection<Polygon, ExportedFieldProperties> {
    return {
      type: 'FeatureCollection',
      features: this.entries.map(exportEntry),
    }
  }
}
