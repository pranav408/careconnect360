import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()
const mockListAdminClaims = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/adminClaimApi', () => ({
  listAdminClaims: (...args: unknown[]) => mockListAdminClaims(...args),
  verifyAdminClaim: vi.fn(),
  approveAdminClaim: vi.fn(),
  rejectAdminClaim: vi.fn(),
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

describe('admin claim route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockListAdminClaims.mockReset()
    mockListAdminClaims.mockResolvedValue({
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
      <MemoryRouter initialEntries={['/admin/claims']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('blocks patient role from admin claim route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('PATIENT'))

    render(
      <MemoryRouter initialEntries={['/admin/claims']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks doctor role from admin claim route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('DOCTOR'))

    render(
      <MemoryRouter initialEntries={['/admin/claims']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('allows admin role to access admin claim route', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('ADMIN'))

    render(
      <MemoryRouter initialEntries={['/admin/claims']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Claim Management')).toBeInTheDocument()
  })
})
