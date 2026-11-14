import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { LatLng } from './geo'
import { formatPlace, type Address, type Place } from './place'
import type { SelectionMode, Territory } from './territory'

export type TerritoryEntry = {
  id: string
  name: string
  place: Place | null
  territory: Territory
}

export type TerritoryEntryDetails = Omit<TerritoryEntry, 'id'>

export type ExportedGeocoding = Address & {
  label: string
  name: string
  point: LatLng
}

export type ExportedTerritoryProperties = {
  id: string
  name: string
  mode: SelectionMode
  areaHectares: number
  radiusMeters: number | null
  center: LatLng
  points: LatLng[]
  geocoding: ExportedGeocoding | null
}

export type ExportedTerritoryFeature = Feature<Polygon, ExportedTerritoryProperties>

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

function exportEntry({ id, name, place, territory }: TerritoryEntry): ExportedTerritoryFeature {
  const { properties, geometry } = territory.feature
  return {
    type: 'Feature',
    id,
    geometry: roundGeometry(geometry),
    properties: {
      id,
      name,
      mode: territory.mode,
      areaHectares: roundTo(territory.areaHectares, AREA_PRECISION),
      radiusMeters: properties.mode === 'radius' ? roundTo(properties.radiusMeters, RADIUS_PRECISION) : null,
      center: roundPoint(territory.center),
      points: territory.points.map(roundPoint),
      geocoding: exportGeocoding(place),
    },
  }
}

export class TerritoryCollection {
  static readonly EMPTY = new TerritoryCollection([])

  static of(entries: readonly TerritoryEntry[]): TerritoryCollection {
    return new TerritoryCollection(entries)
  }

  readonly entries: readonly TerritoryEntry[]

  private constructor(entries: readonly TerritoryEntry[]) {
    this.entries = entries
  }

  get size(): number {
    return this.entries.length
  }

  get isEmpty(): boolean {
    return this.entries.length === 0
  }

  get totalAreaHectares(): number {
    return this.entries.reduce((total, { territory }) => total + territory.areaHectares, 0)
  }

  find(id: string): TerritoryEntry | undefined {
    return this.entries.find((entry) => entry.id === id)
  }

  add(entry: TerritoryEntry): TerritoryCollection {
    return new TerritoryCollection([...this.entries, entry])
  }

  update(id: string, changes: Partial<TerritoryEntryDetails>): TerritoryCollection {
    return new TerritoryCollection(this.entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))
  }

  remove(id: string): TerritoryCollection {
    return new TerritoryCollection(this.entries.filter((entry) => entry.id !== id))
  }

  withDraft(territory: Territory | null, place: Place | null, editingId: string | null): TerritoryCollection {
    if (!territory) {
      return this
    }
    if (editingId) {
      return this.update(editingId, { territory, place })
    }
    return this.add({ id: DRAFT_ENTRY_ID, name: this.nextDefaultName(), place, territory })
  }

  nextDefaultName(): string {
    return `Territory ${this.size + 1}`
  }

  toFeatureCollection(): FeatureCollection<Polygon, ExportedTerritoryProperties> {
    return {
      type: 'FeatureCollection',
      features: this.entries.map(exportEntry),
    }
  }
}
