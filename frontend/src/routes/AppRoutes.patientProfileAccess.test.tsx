import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()
const mockGetMyPatientProfile = vi.fn()
const mockGetMyUnreadNotificationCount = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/patientProfileApi', () => ({
  getMyPatientProfile: (...args: unknown[]) => mockGetMyPatientProfile(...args),
  updateMyPatientProfile: vi.fn(),
}))

vi.mock('../api/patientNotificationApi', () => ({
  getMyUnreadNotificationCount: (...args: unknown[]) => mockGetMyUnreadNotificationCount(...args),
  listMyNotifications: vi.fn(),
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

describe('patient profile route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockGetMyPatientProfile.mockReset()
    mockGetMyUnreadNotificationCount.mockReset()

    mockGetMyPatientProfile.mockResolvedValue({
      patientId: 1,
      email: 'patient@example.com',
      fullName: 'Example Patient',
      phone: '5551234567',
      address: '100 Main Street',
      dateOfBirth: '1990-01-15',
      gender: 'FEMALE',
      accountStatus: 'ACTIVE',
    })
    mockGetMyUnreadNotificationCount.mockResolvedValue({ unreadCount: 2 })
  })

  it('redirects unauthenticated users to login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('allows PATIENT role to access the profile route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('PATIENT'))

    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Edit Profile' })).toBeInTheDocument()
    expect((await screen.findAllByLabelText('2 unread notifications')).length).toBeGreaterThan(0)
  })

  it('blocks ADMIN role from the patient profile route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('ADMIN'))

    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks DOCTOR role from the patient profile route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('DOCTOR'))

    render(
      <MemoryRouter initialEntries={['/patient/profile']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })
})