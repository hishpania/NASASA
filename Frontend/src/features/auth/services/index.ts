import { apiClient } from '@/lib/api'
import { AuthApi } from './AuthApi'

export const authApi = new AuthApi(apiClient)

export { sessionStore } from './SessionStore'
