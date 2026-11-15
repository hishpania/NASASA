import type { HttpClient } from '@/lib/api'
import type { Credentials, Session, User } from '../model/session'

export class AuthApi {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  register(credentials: Credentials): Promise<Session> {
    return this.http.post<Session>('/Auth/register', credentials)
  }

  login(credentials: Credentials): Promise<Session> {
    return this.http.post<Session>('/Auth/login', credentials)
  }

  currentUser(): Promise<User> {
    return this.http.get<User>('/Auth/me')
  }
}
