import area from '@turf/area'
import centroid from '@turf/centroid'
import circle from '@turf/circle'
import type { Feature, Polygon } from 'geojson'
import { fromPosition, toPosition, type Bounds, type LatLng, type LngLatPosition } from './geo'

export type ShapeMode = 'polygon' | 'radius'

export type ShapeProperties =
  | { mode: 'polygon' }
  | { mode: 'radius'; center: LngLatPosition; radiusMeters: number }

export type ShapeFeature = Feature<Polygon, ShapeProperties>

const SQUARE_METERS_PER_HECTARE = 10_000
const CIRCLE_STEPS = 64

export abstract class Shape {
  abstract readonly mode: ShapeMode
  abstract readonly feature: ShapeFeature

  get areaHectares(): number {
    return area(this.feature) / SQUARE_METERS_PER_HECTARE
  }

  get center(): LatLng {
    return fromPosition(centroid(this.feature).geometry.coordinates)
  }

  abstract get points(): readonly LatLng[]

  get outline(): LatLng[] {
    return this.feature.geometry.coordinates[0].map(fromPosition)
  }

  get bounds(): Bounds {
    const outline = this.outline
    const latitudes = outline.map(({ lat }) => lat)
    const longitudes = outline.map(({ lng }) => lng)
    return {
      south: Math.min(...latitudes),
      west: Math.min(...longitudes),
      north: Math.max(...latitudes),
      east: Math.max(...longitudes),
    }
  }
}

export class PolygonShape extends Shape {
  static readonly MIN_VERTICES = 3

  readonly mode = 'polygon'
  readonly vertices: readonly LatLng[]
  readonly feature: ShapeFeature

  get points(): readonly LatLng[] {
    return this.vertices
  }

  constructor(vertices: readonly LatLng[]) {
    super()
    if (vertices.length < PolygonShape.MIN_VERTICES) {
      throw new RangeError(`A polygon shape requires at least ${PolygonShape.MIN_VERTICES} vertices`)
    }
    this.vertices = vertices
    this.feature = {
      type: 'Feature',
      properties: { mode: 'polygon' },
      geometry: {
        type: 'Polygon',
        coordinates: [[...vertices, vertices[0]].map(toPosition)],
      },
    }
  }
}

export class RadiusShape extends Shape {
  readonly mode = 'radius'
  readonly origin: LatLng
  readonly radiusMeters: number
  readonly feature: ShapeFeature

  constructor(origin: LatLng, radiusMeters: number) {
    super()
    if (radiusMeters <= 0) {
      throw new RangeError('Radius must be positive')
    }
    this.origin = origin
    this.radiusMeters = radiusMeters
    this.feature = circle<ShapeProperties>(toPosition(origin), radiusMeters, {
      steps: CIRCLE_STEPS,
      units: 'meters',
      properties: { mode: 'radius', center: toPosition(origin), radiusMeters },
    })
  }

  override get areaHectares(): number {
    return (Math.PI * this.radiusMeters ** 2) / SQUARE_METERS_PER_HECTARE
  }

  override get center(): LatLng {
    return this.origin
  }

  get points(): readonly LatLng[] {
    return [this.origin]
  }
}
