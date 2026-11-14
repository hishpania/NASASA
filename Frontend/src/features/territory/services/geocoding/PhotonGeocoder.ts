import type { Feature, FeatureCollection, Point } from 'geojson'
import { fromPosition, type Bounds, type LatLng } from '../../model/geo'
import type { Address, Place } from '../../model/place'
import type { Geocoder, PlaceSearchOptions } from './Geocoder'

type PhotonProperties = {
  osm_type?: string
  osm_id?: number
  name?: string
  housenumber?: string
  street?: string
  city?: string
  district?: string
  county?: string
  state?: string
  country?: string
  countrycode?: string
  postcode?: string
  extent?: [minLng: number, maxLat: number, maxLng: number, minLat: number]
}

type PhotonFeature = Feature<Point, PhotonProperties>

export class GeocodingError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Geocoding request failed with status ${status}`)
    this.name = 'GeocodingError'
    this.status = status
  }
}

const REVERSE_RADIUS_KM = 10

export class PhotonGeocoder implements Geocoder {
  private readonly baseUrl: string
  private readonly language: string

  constructor(baseUrl: string, language = 'en') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.language = language
  }

  async search(query: string, { signal, near, limit = 6 }: PlaceSearchOptions = {}): Promise<Place[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit), lang: this.language })
    if (near) {
      params.set('lat', String(near.lat))
      params.set('lon', String(near.lng))
    }
    const collection = await this.request('/api', params, signal)
    return collection.features.map((feature) => this.toPlace(feature))
  }

  async reverse(point: LatLng, signal?: AbortSignal): Promise<Place | null> {
    const params = new URLSearchParams({
      lat: String(point.lat),
      lon: String(point.lng),
      lang: this.language,
      radius: String(REVERSE_RADIUS_KM),
    })
    const collection = await this.request('/reverse', params, signal)
    const [feature] = collection.features
    return feature ? this.toSettlement(feature, point) : null
  }

  private async request(
    path: string,
    params: URLSearchParams,
    signal?: AbortSignal,
  ): Promise<FeatureCollection<Point, PhotonProperties>> {
    const response = await fetch(`${this.baseUrl}${path}?${params}`, { signal })
    if (!response.ok) {
      throw new GeocodingError(response.status)
    }
    return response.json()
  }

  private toPlace(feature: PhotonFeature): Place {
    const properties = feature.properties
    const name = this.resolveName(properties)
    const point = fromPosition(feature.geometry.coordinates)

    return {
      id: `${properties.osm_type ?? 'X'}${properties.osm_id ?? `${point.lat},${point.lng}`}`,
      name,
      description: this.resolveDescription(properties, name),
      point,
      bounds: properties.extent ? this.toBounds(properties.extent) : null,
      address: this.toAddress(properties),
    }
  }

  private toSettlement(feature: PhotonFeature, point: LatLng): Place {
    const { district, city, county, state, country } = feature.properties
    const parts = [district, city, county, state, country].filter((part): part is string => Boolean(part))
    const [name = 'Unnamed area', ...rest] = [...new Set(parts)]

    return {
      id: `${point.lat},${point.lng}`,
      name,
      description: rest.join(', '),
      point,
      bounds: null,
      address: this.toAddress(feature.properties),
    }
  }

  private toAddress(properties: PhotonProperties): Address {
    return {
      district: properties.district ?? null,
      city: properties.city ?? null,
      county: properties.county ?? null,
      state: properties.state ?? null,
      country: properties.country ?? null,
      countryCode: properties.countrycode ?? null,
      postcode: properties.postcode ?? null,
    }
  }

  private resolveName(properties: PhotonProperties): string {
    const address = [properties.street, properties.housenumber].filter(Boolean).join(' ')
    return properties.name ?? (address || properties.city || properties.county || 'Unnamed place')
  }

  private resolveDescription(properties: PhotonProperties, name: string): string {
    const parts = [properties.district, properties.city, properties.county, properties.state, properties.country]
    return [...new Set(parts.filter((part): part is string => Boolean(part) && part !== name))].join(', ')
  }

  private toBounds([minLng, maxLat, maxLng, minLat]: NonNullable<PhotonProperties['extent']>): Bounds {
    return { south: minLat, west: minLng, north: maxLat, east: maxLng }
  }
}
