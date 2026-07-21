import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()
const mockListMyNotifications = vi.fn()
const mockGetMyUnreadNotificationCount = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/patientNotificationApi', () => ({
  listMyNotifications: (...args: unknown[]) => mockListMyNotifications(...args),
  getMyUnreadNotificationCount: (...args: unknown[]) => mockGetMyUnreadNotificationCount(...args),
  markMyNotificationRead: vi.fn(),
  markAllMyNotificationsRead: vi.fn(),
}))

function asAuthenticatedUser(role: 'PATIENT' | 'DOCTOR' | 'ADMIN') {
  return {
    user: {
      userId: 1,
      email: `${role.toLowerCase()}@example.com`,
      role,
      status: 'ACTIVE',
      displayName: `${role} User`,
    },
    isAuthenticated: true,
    isRestoringSession: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }
}

function makePage(content: Array<Record<string, unknown>>) {
  return {
    content,
    pageable: {
      pageNumber: 0,
      pageSize: 10,
      sort: { empty: false, sorted: true, unsorted: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: content.length,
    totalPages: 1,
    last: true,
    size: 10,
    number: 0,
    sort: { empty: false, sorted: true, unsorted: false },
    first: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  }
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('min-width:900px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
})

describe('patient notifications route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockListMyNotifications.mockReset()
    mockGetMyUnreadNotificationCount.mockReset()

    mockListMyNotifications.mockResolvedValue(makePage([]))
    mockGetMyUnreadNotificationCount.mockResolvedValue({ unreadCount: 3 })
  })

  it('redirects unauthenticated user to login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/patient/notifications']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('allows PATIENT role to access patient notifications and shows top-bar unread badge', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('PATIENT'))

    render(
      <MemoryRouter initialEntries={['/patient/notifications']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect((await screen.findAllByLabelText('3 unread notifications')).length).toBeGreaterThan(0)
  })

  it('blocks DOCTOR role from patient notifications', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('DOCTOR'))

    render(
      <MemoryRouter initialEntries={['/patient/notifications']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks ADMIN role from patient notifications', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('ADMIN'))

    render(
      <MemoryRouter initialEntries={['/patient/notifications']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })
})