import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearAuthStorage,
  getAuthToken,
  saveAuthToken,
  saveCurrentUser,
} from './authStorage'
import {
  getCurrentAuthenticatedUser,
  login as loginApi,
  registerPatient,
} from '../api/authApi'
import type {
  AuthUser,
  CurrentUserResponse,
  LoginRequest,
  RegisterPatientRequest,
  RegisterPatientResponse,
} from '../types/auth'
import { toDisplayName } from './roleUtils'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isRestoringSession: boolean
  login: (request: LoginRequest) => Promise<AuthUser>
  register: (request: RegisterPatientRequest) => Promise<RegisterPatientResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapToAuthUser(currentUser: CurrentUserResponse): AuthUser {
  return {
    ...currentUser,
    displayName: toDisplayName(currentUser.email),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isRestoringSession, setIsRestoringSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      const token = getAuthToken()

      if (!token) {
        if (!cancelled) {
          setUser(null)
          setIsRestoringSession(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentAuthenticatedUser()
        if (cancelled) {
          return
        }

        const mapped = mapToAuthUser(currentUser)
        setUser(mapped)
        saveCurrentUser(mapped)
      } catch {
        if (!cancelled) {
          clearAuthStorage()
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (request: LoginRequest): Promise<AuthUser> => {
    const loginResponse = await loginApi(request)
    saveAuthToken(loginResponse.accessToken)

    const currentUser = await getCurrentAuthenticatedUser()
    const mapped = mapToAuthUser(currentUser)
    saveCurrentUser(mapped)
    setUser(mapped)

    return mapped
  }, [])

  const register = useCallback(
    async (request: RegisterPatientRequest): Promise<RegisterPatientResponse> => {
      return registerPatient(request)
    },
    [],
  )

  const logout = useCallback(() => {
    clearAuthStorage()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRestoringSession,
      login,
      register,
      logout,
    }),
    [isRestoringSession, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
export type { AuthContextValue }
