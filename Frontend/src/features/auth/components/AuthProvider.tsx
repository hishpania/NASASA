import { apiClient } from '@/lib/api'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '../hooks/AuthContext'
import type { Credentials, Session } from '../model/session'
import { authApi, sessionStore } from '../services'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(sessionStore.current)

  const establish = useCallback((next: Session) => {
    sessionStore.save(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    sessionStore.clear()
    setSession(null)
  }, [])

  const signIn = useCallback(
    async (credentials: Credentials) => establish(await authApi.login(credentials)),
    [establish],
  )

  const signUp = useCallback(
    async (credentials: Credentials) => establish(await authApi.register(credentials)),
    [establish],
  )

  useEffect(() => apiClient.onUnauthorized(signOut), [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ session, signIn, signUp, signOut }),
    [session, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
