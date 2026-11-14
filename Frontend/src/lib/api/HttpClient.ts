import { ApiError, type ProblemDetails } from './ApiError'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type AccessTokenProvider = () => string | null

export class HttpClient {
  private readonly baseUrl: string
  private readonly getAccessToken: AccessTokenProvider
  private readonly unauthorizedListeners = new Set<() => void>()

  constructor(baseUrl: string, getAccessToken: AccessTokenProvider) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.getAccessToken = getAccessToken
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.send<T>('GET', path, undefined, signal)
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>('POST', path, body)
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>('PUT', path, body)
  }

  delete(path: string): Promise<void> {
    return this.send<void>('DELETE', path)
  }

  onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.add(listener)
    return () => this.unauthorizedListeners.delete(listener)
  }

  private async send<T>(method: HttpMethod, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' })
    const accessToken = this.getAccessToken()
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const error = new ApiError(response.status, await HttpClient.readProblem(response))
      if (error.isUnauthorized && accessToken) {
        this.unauthorizedListeners.forEach((listener) => listener())
      }
      throw error
    }

    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  }

  private static async readProblem(response: Response): Promise<ProblemDetails | null> {
    try {
      return (await response.json()) as ProblemDetails
    } catch {
      return null
    }
  }
}
