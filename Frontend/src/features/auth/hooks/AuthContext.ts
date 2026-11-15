import { createContext } from 'react'
import type { Credentials, Session } from '../model/session'

export type AuthContextValue = {
  session: Session | null
  signIn: (credentials: Credentials) => Promise<void>
  signUp: (credentials: Credentials) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
