import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('patient route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects unauthenticated user to login for patient doctors route', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/patient/doctors']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('blocks non-patient role from patient appointments route', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        userId: 7,
        email: 'doctor@example.com',
        role: 'DOCTOR',
        status: 'ACTIVE',
        displayName: 'Doctor User',
      },
      isAuthenticated: true,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks doctor role from patient insurance route', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        userId: 7,
        email: 'doctor@example.com',
        role: 'DOCTOR',
        status: 'ACTIVE',
        displayName: 'Doctor User',
      },
      isAuthenticated: true,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/patient/insurance']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks admin role from patient insurance route', async () => {
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
      <MemoryRouter initialEntries={['/patient/insurance']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('redirects unauthenticated user to login for patient insurance route', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isRestoringSession: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/patient/insurance']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
