import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminInsuranceManagementPage } from './AdminInsuranceManagementPage'

const mockListAdminInsurancePolicies = vi.fn()
const mockActivateAdminInsurancePolicy = vi.fn()
const mockRejectAdminInsurancePolicy = vi.fn()

vi.mock('../../api/adminInsuranceApi', () => ({
  listAdminInsurancePolicies: (...args: unknown[]) => mockListAdminInsurancePolicies(...args),
  activateAdminInsurancePolicy: (...args: unknown[]) => mockActivateAdminInsurancePolicy(...args),
  rejectAdminInsurancePolicy: (...args: unknown[]) => mockRejectAdminInsurancePolicy(...args),
}))

function makePage(content: Array<Record<string, unknown>>, overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
}

function policyFixture(overrides: Record<string, unknown> = {}) {
  return {
    policyId: 1,
    providerName: 'United Healthcare',
    policyNumber: 'CC360-POL-1001',
    coveragePercentage: 80,
    deductibleAmount: 500,
    startDate: '2027-01-01',
    endDate: '2027-12-31',
    status: 'PENDING',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminInsuranceManagementPage />
    </MemoryRouter>,
  )
}

describe('AdminInsuranceManagementPage', () => {
  beforeEach(() => {
    mockListAdminInsurancePolicies.mockReset()
    mockActivateAdminInsurancePolicy.mockReset()
    mockRejectAdminInsurancePolicy.mockReset()
  })

  it('renders backend policies and status summaries', async () => {
    mockListAdminInsurancePolicies.mockResolvedValue(
      makePage([
        policyFixture({ status: 'PENDING' }),
        policyFixture({ policyId: 2, policyNumber: 'CC360-POL-2002', status: 'ACTIVE' }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Insurance Management')).toBeInTheDocument()
    expect(screen.getAllByText('United Healthcare').length).toBeGreaterThan(0)
    expect(screen.getByText('Policy Number: CC360-POL-1001')).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Current page').length).toBeGreaterThan(0)
  })

  it('sends exact status, patientEmail, policyNumber, page, size and sort params', async () => {
    const user = userEvent.setup()
    mockListAdminInsurancePolicies.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByText('Insurance Management')

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Pending' }))
    await user.type(screen.getByLabelText('Patient Email'), 'patient@example.com')
    await user.type(screen.getByLabelText('Policy Number'), 'CC360-POL-1001')
    await user.click(screen.getByLabelText('Page Size'))
    await user.click(screen.getByRole('option', { name: '20' }))
    await user.click(screen.getByLabelText('Sort'))
    await user.click(screen.getByRole('option', { name: 'Policy number A-Z' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListAdminInsurancePolicies).toHaveBeenLastCalledWith({
        status: 'PENDING',
        patientEmail: 'patient@example.com',
        policyNumber: 'CC360-POL-1001',
        page: 0,
        size: 20,
        sort: 'policyNumber,asc',
      })
    })
  })

  it('renders loading state skeleton before first response', async () => {
    mockListAdminInsurancePolicies.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    expect(screen.getByLabelText('Loading insurance policies')).toBeInTheDocument()
  })

  it('renders no-system-policies empty state', async () => {
    mockListAdminInsurancePolicies.mockResolvedValue(makePage([]))

    renderPage()

    expect(await screen.findByText('No insurance policies in the system')).toBeInTheDocument()
  })

  it('renders no-filter-result empty state and supports clear filters action', async () => {
    const user = userEvent.setup()
    mockListAdminInsurancePolicies.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByText('Insurance Management')

    await user.type(screen.getByLabelText('Policy Number'), 'NOT-FOUND-001')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No search results')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Clear Filters' })[0])

    await waitFor(() => {
      expect(mockListAdminInsurancePolicies).toHaveBeenLastCalledWith({
        page: 0,
        size: 10,
        sort: 'createdAt,desc',
      })
    })
  })

  it('supports pagination with backend zero-based page parameter', async () => {
    const user = userEvent.setup()
    mockListAdminInsurancePolicies
      .mockResolvedValueOnce(makePage([policyFixture()], { totalPages: 2, totalElements: 11, number: 0 }))
      .mockResolvedValueOnce(makePage([policyFixture({ policyId: 2 })], { totalPages: 2, totalElements: 11, number: 1 }))

    renderPage()
    await screen.findByText('Insurance Management')

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))

    await waitFor(() => {
      expect(mockListAdminInsurancePolicies).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        sort: 'createdAt,desc',
      })
    })
  })

  it('shows action matrix only for pending policies', async () => {
    mockListAdminInsurancePolicies.mockResolvedValue(
      makePage([
        policyFixture({ status: 'PENDING' }),
        policyFixture({ policyId: 2, status: 'ACTIVE' }),
        policyFixture({ policyId: 3, status: 'REJECTED' }),
        policyFixture({ policyId: 4, status: 'EXPIRED' }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Insurance Management')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Activate' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Reject' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('No actions').length).toBeGreaterThan(0)
  })

  it('opens activation dialog, calls exact endpoint, and updates status to ACTIVE', async () => {
    const user = userEvent.setup()

    mockListAdminInsurancePolicies
      .mockResolvedValueOnce(makePage([policyFixture({ status: 'PENDING' })]))
      .mockResolvedValueOnce(makePage([policyFixture({ status: 'ACTIVE' })]))

    mockActivateAdminInsurancePolicy.mockResolvedValue(policyFixture({ status: 'ACTIVE' }))

    renderPage()

    await screen.findByText('Insurance Management')
    await user.click(screen.getByRole('button', { name: 'Activate' }))

    expect(await screen.findByText('Activate policy?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Activation' }))

    await waitFor(() => {
      expect(mockActivateAdminInsurancePolicy).toHaveBeenCalledWith(1)
    })

    expect(await screen.findByText('Policy CC360-POL-1001 is now ACTIVE.')).toBeInTheDocument()
  })

  it('prevents duplicate activation submission', async () => {
    const user = userEvent.setup()

    mockListAdminInsurancePolicies.mockResolvedValue(makePage([policyFixture({ status: 'PENDING' })]))
    mockActivateAdminInsurancePolicy.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()
    await screen.findByText('Insurance Management')

    await user.click(screen.getByRole('button', { name: 'Activate' }))

    const confirmButton = await screen.findByRole('button', { name: 'Confirm Activation' })
    await user.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(mockActivateAdminInsurancePolicy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Activating...' })).toBeDisabled()
  })

  it('handles activation 409 safely and keeps policy pending', async () => {
    const user = userEvent.setup()

    mockListAdminInsurancePolicies.mockResolvedValue(makePage([policyFixture({ status: 'PENDING' })]))
    mockActivateAdminInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'The patient already has an active insurance policy',
          path: '/api/admin/insurance/policies/1/activate',
        },
      },
    })

    renderPage()
    await screen.findByText('Insurance Management')

    await user.click(screen.getByRole('button', { name: 'Activate' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Activation' }))

    expect(await screen.findByText('The patient already has an active insurance policy')).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('opens rejection dialog, validates reason, sends exact body, and updates status', async () => {
    const user = userEvent.setup()

    mockListAdminInsurancePolicies
      .mockResolvedValueOnce(makePage([policyFixture({ status: 'PENDING' })]))
      .mockResolvedValueOnce(makePage([policyFixture({ status: 'REJECTED' })]))

    mockRejectAdminInsurancePolicy.mockResolvedValue(policyFixture({ status: 'REJECTED' }))

    renderPage()
    await screen.findByText('Insurance Management')

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    const rejectionDialog = await screen.findByRole('dialog', { name: 'Reject policy?' })
    expect(rejectionDialog).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }))
    expect(await screen.findByText('Rejection reason is required.')).toBeInTheDocument()

    fireEvent.change(within(rejectionDialog).getByRole('textbox', { name: /rejection reason/i }), {
      target: { value: 'Policy information could not be verified' },
    })
    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }))

    await waitFor(() => {
      expect(mockRejectAdminInsurancePolicy).toHaveBeenCalledWith(1, {
        reason: 'Policy information could not be verified',
      })
    })

    expect(await screen.findByText('Policy CC360-POL-1001 was rejected.')).toBeInTheDocument()
  })

  it('prevents duplicate rejection submissions', async () => {
    const user = userEvent.setup()
    const rejectedPolicyResponse = policyFixture({ status: 'REJECTED' })
    let resolveRejectRequest: (value: Record<string, unknown>) => void = () => {
      throw new Error('Reject request resolver was not initialized')
    }
    const rejectRequest = new Promise<Record<string, unknown>>((resolve) => {
      resolveRejectRequest = resolve
    })

    mockListAdminInsurancePolicies
      .mockResolvedValueOnce(makePage([policyFixture({ status: 'PENDING' })]))
      .mockResolvedValueOnce(makePage([rejectedPolicyResponse]))
    mockRejectAdminInsurancePolicy.mockImplementation(() => rejectRequest)

    try {
      renderPage()
      await screen.findByText('Insurance Management')

      await user.click(screen.getByRole('button', { name: 'Reject' }))
      const rejectionDialog = await screen.findByRole('dialog', { name: 'Reject policy?' })

      fireEvent.change(within(rejectionDialog).getByRole('textbox', { name: /rejection reason/i }), {
        target: { value: 'Insufficient documentation' },
      })

      const confirmButton = screen.getByRole('button', { name: 'Confirm Rejection' })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockRejectAdminInsurancePolicy).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('button', { name: 'Rejecting...' })).toBeDisabled()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Rejecting...' }))

      expect(mockRejectAdminInsurancePolicy).toHaveBeenCalledTimes(1)

      resolveRejectRequest(rejectedPolicyResponse)

      expect(await screen.findByText('Policy CC360-POL-1001 was rejected.')).toBeInTheDocument()
    } finally {
      mockRejectAdminInsurancePolicy.mockReset()
      vi.useRealTimers()
    }
  })

  it('renders mobile policy cards and keeps long policy numbers readable', async () => {
    mockListAdminInsurancePolicies.mockResolvedValue(
      makePage([
        policyFixture({
          policyNumber: 'CC360-POL-WITH-VERY-LONG-IDENTIFIER-1234567890-ABCDEFGHIJ',
          status: 'EXPIRED',
        }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Insurance Management')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/CC360-POL-WITH-VERY-LONG-IDENTIFIER/)).toBeInTheDocument()
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)
  })

  it('does not render sensitive data including JWT or password fields', async () => {
    localStorage.setItem('careconnect360.auth.token', 'super-secret-jwt')

    mockListAdminInsurancePolicies.mockResolvedValue(
      makePage([
        policyFixture({
          password: 'secret',
          passwordHash: 'hash-value',
          jwt: 'raw-jwt-token',
        }),
      ]),
    )

    renderPage()

    await screen.findByText('Insurance Management')
    expect(document.body.textContent).not.toContain('super-secret-jwt')
    expect(document.body.textContent).not.toContain('hash-value')
    expect(document.body.textContent).not.toContain('raw-jwt-token')
  })
})