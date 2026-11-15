import type { LatLng } from '../../model/geo'

export type LocatedPosition = {
  point: LatLng
  accuracyMeters: number
}

export type GeolocationErrorReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

const ERROR_MESSAGES: Record<GeolocationErrorReason, string> = {
  unsupported: 'Your browser does not support geolocation.',
  denied: 'Location access was denied. Allow it in the browser settings or search for a place instead.',
  unavailable:
    'Could not determine your location. Make sure Location Services are enabled for your browser in the system settings, or search for a place instead.',
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

const PRECISE_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
const APPROXIMATE_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 }

export class BrowserGeolocation {
  private readonly attempts: PositionOptions[]

  constructor(attempts: PositionOptions[] = [PRECISE_OPTIONS, APPROXIMATE_OPTIONS]) {
    this.attempts = attempts
  }

  async locate(): Promise<LocatedPosition> {
    if (!('geolocation' in navigator)) {
      throw new GeolocationError('unsupported')
    }
    let lastError = new GeolocationError('unavailable')
    for (const options of this.attempts) {
      try {
        return await BrowserGeolocation.request(options)
      } catch (error) {
        lastError = error instanceof GeolocationError ? error : lastError
        if (lastError.reason === 'denied') {
          break
        }
      }
    }
    throw lastError
  }

  private static request(options: PositionOptions): Promise<LocatedPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({
            point: { lat: coords.latitude, lng: coords.longitude },
            accuracyMeters: coords.accuracy,
          }),
        (error) => reject(new GeolocationError(REASON_BY_CODE[error.code] ?? 'unavailable')),
        options,
      )
    })
  }
}
