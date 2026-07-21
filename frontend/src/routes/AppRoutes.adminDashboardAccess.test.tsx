import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()
const mockGetAdminDashboard = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/adminDashboardApi', () => ({
  getAdminDashboard: (...args: unknown[]) => mockGetAdminDashboard(...args),
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

describe('admin dashboard route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockGetAdminDashboard.mockReset()
    mockGetAdminDashboard.mockResolvedValue({
      totalPatientCount: 0,
      totalDoctorCount: 0,
      availableDoctorCount: 0,
      totalAppointmentCount: 0,
      appointmentCounts: [],
      policyCounts: [],
      claimCounts: [],
      successfulPaymentCount: 0,
      failedPaymentCount: 0,
      totalSuccessfulPaymentAmount: 0,
      unreadNotificationCount: 0,
      recentAppointments: [],
      recentClaims: [],
      recentSuccessfulPayments: [],
      averageSettlementTime: 'UNSUPPORTED',
    })
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
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('blocks patient role from admin dashboard', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('PATIENT'))

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks doctor role from admin dashboard', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('DOCTOR'))

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('allows admin role to access the dashboard', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('ADMIN'))

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument()
  })
})