import type { AuthUser } from '../types/auth'

const TOKEN_STORAGE_KEY = 'careconnect360.auth.token'
const USER_STORAGE_KEY = 'careconnect360.auth.user'

function normalizeToken(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim()
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function saveAuthToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, normalizeToken(token))
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function saveCurrentUser(user: AuthUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed || typeof parsed.email !== 'string' || typeof parsed.role !== 'string') {
      clearAuthStorage()
      return null
    }
    return parsed
  } catch {
    clearAuthStorage()
    return null
  }
}

export function clearAuthStorage(): void {
  removeAuthToken()
  localStorage.removeItem(USER_STORAGE_KEY)
}

// MVP limitation: browser localStorage is used for token persistence.
