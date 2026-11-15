import { useCallback, useState } from 'react'
import { GeolocationError, geolocation, type LocatedPosition } from '../services'

type GeolocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; position: LocatedPosition }
  | { status: 'failed'; error: GeolocationError }

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' })

  const locate = useCallback(async (): Promise<LocatedPosition | null> => {
    setState({ status: 'locating' })
    try {
      const position = await geolocation.locate()
      setState({ status: 'located', position })
      return position
    } catch (error) {
      setState({
        status: 'failed',
        error: error instanceof GeolocationError ? error : new GeolocationError('unavailable'),
      })
      return null
    }
  }, [])

  return {
    status: state.status,
    position: state.status === 'located' ? state.position : null,
    error: state.status === 'failed' ? state.error : null,
    locate,
  }
}
