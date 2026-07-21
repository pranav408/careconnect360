import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('doctor route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects unauthenticated user to login for doctor appointments route', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/doctor/appointments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('blocks patient role from doctor routes', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        userId: 11,
        email: 'patient@example.com',
        role: 'PATIENT',
        status: 'ACTIVE',
        displayName: 'Patient User',
      },
      isAuthenticated: true,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/doctor/appointments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks admin role from doctor routes', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        userId: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        displayName: 'Admin User',
      },
      isAuthenticated: true,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/doctor/appointments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })
})
