import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()
const mockListAdminDoctors = vi.fn()
const mockGetAdminDoctorDetail = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/adminDoctorApi', () => ({
  listAdminDoctors: (...args: unknown[]) => mockListAdminDoctors(...args),
  getAdminDoctorDetail: (...args: unknown[]) => mockGetAdminDoctorDetail(...args),
  createAdminDoctor: vi.fn(),
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

describe('admin doctor route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockListAdminDoctors.mockReset()
    mockGetAdminDoctorDetail.mockReset()
    mockListAdminDoctors.mockResolvedValue({
      content: [],
      pageable: {
        pageNumber: 0,
        pageSize: 10,
        sort: { empty: false, sorted: true, unsorted: false },
        offset: 0,
        paged: true,
        unpaged: false,
      },
      totalElements: 0,
      totalPages: 0,
      last: true,
      size: 10,
      number: 0,
      sort: { empty: false, sorted: true, unsorted: false },
      first: true,
      numberOfElements: 0,
      empty: true,
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
      <MemoryRouter initialEntries={['/admin/doctors']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('blocks patient role from admin doctors route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('PATIENT'))

    render(
      <MemoryRouter initialEntries={['/admin/doctors']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks doctor role from admin doctors route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('DOCTOR'))

    render(
      <MemoryRouter initialEntries={['/admin/doctors']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('allows admin role to access admin doctors route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('ADMIN'))

    render(
      <MemoryRouter initialEntries={['/admin/doctors']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Doctor Management' })).toBeInTheDocument()
  })
})
