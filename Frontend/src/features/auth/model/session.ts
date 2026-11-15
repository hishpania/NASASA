export type User = {
  id: number
  email: string
}

export type Session = {
  accessToken: string
  expiresAt: string
  user: User
}

export type Credentials = {
  email: string
  password: string
}

export function isSessionExpired(session: Session, now: Date = new Date()): boolean {
  return new Date(session.expiresAt).getTime() <= now.getTime()
}
