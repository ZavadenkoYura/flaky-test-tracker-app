import type { CurrentUser } from './api'

export type AuthState =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser }
