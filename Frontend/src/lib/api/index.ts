import { env } from '@/config/env'
import { sessionStore } from '@/features/auth/services/SessionStore'
import { HttpClient } from './HttpClient'

export const apiClient = new HttpClient(env.apiUrl, () => sessionStore.current?.accessToken ?? null)

export { ApiError } from './ApiError'
export type { HttpClient } from './HttpClient'
