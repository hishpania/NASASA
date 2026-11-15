import { isSessionExpired, type Session } from '../model/session'

const STORAGE_KEY = 'neosphere.session'

export class SessionStore {
  private session: Session | null

  constructor() {
    this.session = SessionStore.restore()
  }

  get current(): Session | null {
    return this.session
  }

  save(session: Session): void {
    this.session = session
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      return
    }
  }

  clear(): void {
    this.session = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      return
    }
  }

  private static restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const session = raw ? (JSON.parse(raw) as Session) : null
      return session && !isSessionExpired(session) ? session : null
    } catch {
      return null
    }
  }
}

export const sessionStore = new SessionStore()
