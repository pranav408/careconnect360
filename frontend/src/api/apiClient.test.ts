import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()
const requestUseMock = vi.fn()
const responseUseMock = vi.fn()
const getAuthTokenMock = vi.fn()
const clearAuthStorageMock = vi.fn()

vi.mock('axios', () => ({
  default: {
    create: (...args: unknown[]) => createMock(...args),
    isAxiosError: (value: unknown) =>
      typeof value === 'object' && value !== null && (value as { isAxiosError?: boolean }).isAxiosError === true,
  },
}))

vi.mock('../auth/authStorage', () => ({
  getAuthToken: () => getAuthTokenMock(),
  clearAuthStorage: () => clearAuthStorageMock(),
}))

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    createMock.mockReset()
    requestUseMock.mockReset()
    responseUseMock.mockReset()
    getAuthTokenMock.mockReset()
    clearAuthStorageMock.mockReset()

    createMock.mockReturnValue({
      interceptors: {
        request: {
          use: (...args: unknown[]) => requestUseMock(...args),
        },
        response: {
          use: (...args: unknown[]) => responseUseMock(...args),
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses normalized resolver result for axios baseURL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '  https://api.example.com/api///  ')

    await import('./apiClient')

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://api.example.com/api' }),
    )
  })

  it('falls back to /api when env is missing', async () => {
    await import('./apiClient')

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ baseURL: '/api' }))
  })

  it('keeps bearer header behavior unchanged for protected endpoints', async () => {
    getAuthTokenMock.mockReturnValue('Bearer token-value')
    await import('./apiClient')

    const requestInterceptor = requestUseMock.mock.calls[0]?.[0] as
      | ((config: { url?: string; headers: Record<string, string> }) => { headers: Record<string, string> })
      | undefined

    expect(requestInterceptor).toBeTypeOf('function')

    const config = requestInterceptor!({ url: '/appointments', headers: {} })
    expect(config.headers.Authorization).toBe('Bearer token-value')
  })

  it('keeps 401 logout redirect behavior unchanged', async () => {
    await import('./apiClient')
    const assignMock = vi.fn()
    vi.stubGlobal('window', {
      location: {
        pathname: '/dashboard',
        assign: assignMock,
      },
    })

    const responseRejected = responseUseMock.mock.calls[0]?.[1] as
      | ((error: { response?: { status?: number } }) => Promise<never>)
      | undefined

    expect(responseRejected).toBeTypeOf('function')

    await expect(responseRejected!({ response: { status: 401 } })).rejects.toEqual({
      response: { status: 401 },
    })

    expect(clearAuthStorageMock).toHaveBeenCalledTimes(1)
    expect(assignMock).toHaveBeenCalledWith('/login')
  })
})
