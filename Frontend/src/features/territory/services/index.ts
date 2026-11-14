import { env } from '@/config/env'
import { apiClient } from '@/lib/api'
import { PhotonGeocoder } from './geocoding/PhotonGeocoder'
import { BrowserGeolocation } from './geolocation/BrowserGeolocation'
import { TerritoryApi } from './territories/TerritoryApi'

export const geocoder = new PhotonGeocoder(env.photonUrl)
export const geolocation = new BrowserGeolocation()
export const territoryApi = new TerritoryApi(apiClient)

export type { Geocoder } from './geocoding/Geocoder'
export type { Place } from '../model/place'
export type { LocatedPosition } from './geolocation/BrowserGeolocation'
export { GeolocationError } from './geolocation/BrowserGeolocation'
