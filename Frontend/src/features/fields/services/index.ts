import { env } from '@/config/env'
import { apiClient } from '@/lib/api'
import { PhotonGeocoder } from './geocoding/PhotonGeocoder'
import { BrowserGeolocation } from './geolocation/BrowserGeolocation'
import { FieldApi } from './fields/FieldApi'

export const geocoder = new PhotonGeocoder(env.photonUrl)
export const geolocation = new BrowserGeolocation()
export const fieldApi = new FieldApi(apiClient)

export type { Geocoder } from './geocoding/Geocoder'
export type { Place } from '../model/place'
export type { LocatedPosition } from './geolocation/BrowserGeolocation'
export { GeolocationError } from './geolocation/BrowserGeolocation'
