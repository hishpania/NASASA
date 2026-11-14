import type { LatLng } from '../../model/geo'

export type LocatedPosition = {
  point: LatLng
  accuracyMeters: number
}

export type GeolocationErrorReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

const ERROR_MESSAGES: Record<GeolocationErrorReason, string> = {
  unsupported: 'Your browser does not support geolocation.',
  denied: 'Location access was denied. Allow it in the browser settings or search for a place instead.',
  unavailable: 'Your location is currently unavailable.',
  timeout: 'Locating took too long. Try again.',
}

const REASON_BY_CODE: Record<number, GeolocationErrorReason> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
}

export class GeolocationError extends Error {
  readonly reason: GeolocationErrorReason

  constructor(reason: GeolocationErrorReason) {
    super(ERROR_MESSAGES[reason])
    this.name = 'GeolocationError'
    this.reason = reason
  }
}

export class BrowserGeolocation {
  private readonly options: PositionOptions

  constructor(options: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }) {
    this.options = options
  }

  locate(): Promise<LocatedPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new GeolocationError('unsupported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({
            point: { lat: coords.latitude, lng: coords.longitude },
            accuracyMeters: coords.accuracy,
          }),
        (error) => reject(new GeolocationError(REASON_BY_CODE[error.code] ?? 'unavailable')),
        this.options,
      )
    })
  }
}
