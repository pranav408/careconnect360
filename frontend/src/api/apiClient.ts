import axios from 'axios'
import type { AxiosError } from 'axios'
import { clearAuthStorage, getAuthToken } from '../auth/authStorage'
import { isApiErrorResponse } from '../types/api'
import { resolveApiBaseUrl } from './apiBaseUrl'

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

function isPublicAuthEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  return (
    url === '/auth/login' ||
    url === '/auth/register/patient' ||
    url.startsWith('/auth/register/patient?')
  )
}

function normalizeTokenForHeader(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim()
}

apiClient.interceptors.request.use((config) => {
  if (isPublicAuthEndpoint(config.url)) {
    delete config.headers.Authorization
    return config
  }

  const token = getAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${normalizeTokenForHeader(token)}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      clearAuthStorage()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (isApiErrorResponse(data)) {
      return data.message
    }

    if (error.code === 'ECONNABORTED') {
      return 'The request took too long. Please try again.'
    }

    if (error.message === 'Network Error') {
      return 'Unable to reach the server. Check your connection and try again.'
    }

    if (error.response?.statusText) {
      return error.response.statusText
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export function getApiErrorStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  return error.response?.status ?? null
}
