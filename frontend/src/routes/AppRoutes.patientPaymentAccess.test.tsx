import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

const mockUseAuth = vi.fn()
const mockListMyPayments = vi.fn()
const mockListMyClaims = vi.fn()

vi.mock('../auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../api/patientPaymentApi', () => ({
  listMyPayments: (...args: unknown[]) => mockListMyPayments(...args),
  createClaimPayment: vi.fn(),
}))

vi.mock('../api/patientClaimApi', () => ({
  listMyClaims: (...args: unknown[]) => mockListMyClaims(...args),
  getMyClaimById: vi.fn(),
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

describe('patient payment route protection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockListMyPayments.mockReset()
    mockListMyClaims.mockReset()

    mockListMyPayments.mockResolvedValue(makePage([]))
    mockListMyClaims.mockResolvedValue(makePage([]))
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
      <MemoryRouter initialEntries={['/patient/payments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('allows PATIENT role to access patient payments', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('PATIENT'))

    render(
      <MemoryRouter initialEntries={['/patient/payments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeInTheDocument()
  })

  it('blocks DOCTOR role from patient payments', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('DOCTOR'))

    render(
      <MemoryRouter initialEntries={['/patient/payments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })

  it('blocks ADMIN role from patient payments', async () => {
    mockUseAuth.mockReturnValue(asAuthenticatedUser('ADMIN'))

    render(
      <MemoryRouter initialEntries={['/patient/payments']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Unauthorized access')).toBeInTheDocument()
  })
})
