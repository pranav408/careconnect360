import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminClaimManagementPage } from './AdminClaimManagementPage'

const mockListAdminClaims = vi.fn()
const mockVerifyAdminClaim = vi.fn()
const mockApproveAdminClaim = vi.fn()
const mockRejectAdminClaim = vi.fn()

vi.mock('../../api/adminClaimApi', () => ({
  listAdminClaims: (...args: unknown[]) => mockListAdminClaims(...args),
  verifyAdminClaim: (...args: unknown[]) => mockVerifyAdminClaim(...args),
  approveAdminClaim: (...args: unknown[]) => mockApproveAdminClaim(...args),
  rejectAdminClaim: (...args: unknown[]) => mockRejectAdminClaim(...args),
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

function claimFixture(overrides: Record<string, unknown> = {}) {
  return {
    claimId: 1,
    appointmentId: 101,
    policyId: 11,
    policyNumber: 'POL-1001',
    patientId: 21,
    patientName: 'Anita Rao',
    doctorId: 31,
    doctorName: 'Dr. Sarah Johnson',
    requestedAmount: 150,
    approvedAmount: null,
    patientResponsibility: null,
    rejectionReason: null,
    status: 'SUBMITTED',
    createdAt: '2026-07-14T10:00:00',
    updatedAt: '2026-07-14T10:00:00',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminClaimManagementPage />
    </MemoryRouter>,
  )
}

describe('AdminClaimManagementPage', () => {
  beforeEach(() => {
    mockListAdminClaims.mockReset()
    mockVerifyAdminClaim.mockReset()
    mockApproveAdminClaim.mockReset()
    mockRejectAdminClaim.mockReset()
  })

  it('renders backend claims and current-page status summaries', async () => {
    mockListAdminClaims.mockResolvedValue(
      makePage([
        claimFixture({ status: 'SUBMITTED' }),
        claimFixture({ claimId: 2, status: 'VERIFIED' }),
        claimFixture({ claimId: 3, status: 'APPROVED' }),
        claimFixture({ claimId: 4, status: 'REJECTED' }),
        claimFixture({ claimId: 5, status: 'PAID' }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Claim Management')).toBeInTheDocument()
    expect(screen.getByText('Claim #1')).toBeInTheDocument()
    expect(screen.getAllByText('Requested Amount: $150.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Current page').length).toBeGreaterThan(0)
  })

  it('sends exact status, patientEmail, policyNumber, appointmentId, page, size, and sort params', async () => {
    const user = userEvent.setup()
    mockListAdminClaims.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Submitted' }))
    await user.type(screen.getByLabelText('Patient Email'), 'patient@example.com')
    await user.type(screen.getByLabelText('Policy Number'), 'POL-1001')
    await user.type(screen.getByLabelText('Appointment ID'), '101')
    await user.click(screen.getByLabelText('Page Size'))
    await user.click(screen.getByRole('option', { name: '20' }))
    await user.click(screen.getByLabelText('Sort'))
    await user.click(screen.getByRole('option', { name: 'Claim ID ascending' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListAdminClaims).toHaveBeenLastCalledWith({
        status: 'SUBMITTED',
        patientEmail: 'patient@example.com',
        policyNumber: 'POL-1001',
        appointmentId: 101,
        page: 0,
        size: 20,
        sort: 'claimId,asc',
      })
    })
  })

  it('renders loading state skeleton before first response', async () => {
    mockListAdminClaims.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    expect(screen.getByLabelText('Loading claims')).toBeInTheDocument()
  })

  it('renders empty and filtered-empty states with clear filters action', async () => {
    const user = userEvent.setup()
    mockListAdminClaims.mockResolvedValue(makePage([]))

    renderPage()
    expect(await screen.findByText('No claims in the system')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Policy Number'), 'NOT-FOUND-001')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No search results')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Clear Filters' })[0])

    await waitFor(() => {
      expect(mockListAdminClaims).toHaveBeenLastCalledWith({
        page: 0,
        size: 10,
        sort: 'createdAt,desc',
      })
    })
  })

  it('supports pagination with backend zero-based page parameter', async () => {
    const user = userEvent.setup()
    mockListAdminClaims
      .mockResolvedValueOnce(makePage([claimFixture()], { totalPages: 2, totalElements: 11, number: 0 }))
      .mockResolvedValueOnce(
        makePage([claimFixture({ claimId: 2, appointmentId: 102 })], {
          totalPages: 2,
          totalElements: 11,
          number: 1,
        }),
      )

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))

    await waitFor(() => {
      expect(mockListAdminClaims).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        sort: 'createdAt,desc',
      })
    })
  })

  it('shows correct action matrix by claim status', async () => {
    mockListAdminClaims.mockResolvedValue(
      makePage([
        claimFixture({ status: 'SUBMITTED' }),
        claimFixture({ claimId: 2, status: 'VERIFIED' }),
        claimFixture({ claimId: 3, status: 'APPROVED' }),
        claimFixture({ claimId: 4, status: 'REJECTED' }),
        claimFixture({ claimId: 5, status: 'PAID' }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Claim Management')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Verify' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Approve' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Reject' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('No actions').length).toBeGreaterThan(0)
  })

  it('opens verify dialog, calls exact endpoint, and updates status to VERIFIED', async () => {
    const user = userEvent.setup()

    mockListAdminClaims
      .mockResolvedValueOnce(makePage([claimFixture({ status: 'SUBMITTED' })]))
      .mockResolvedValueOnce(makePage([claimFixture({ status: 'VERIFIED' })]))

    mockVerifyAdminClaim.mockResolvedValue(claimFixture({ status: 'VERIFIED' }))

    renderPage()

    await screen.findByText('Claim Management')
    await user.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByText('Verify claim?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Verify' }))

    await waitFor(() => {
      expect(mockVerifyAdminClaim).toHaveBeenCalledWith(1)
    })

    expect(await screen.findByText('Claim 1 was verified successfully.')).toBeInTheDocument()
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0)
  })

  it('prevents duplicate verify submission', async () => {
    const user = userEvent.setup()

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'SUBMITTED' })]))
    mockVerifyAdminClaim.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Verify' }))

    const confirmButton = await screen.findByRole('button', { name: 'Confirm Verify' })
    await user.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(mockVerifyAdminClaim).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Verifying...' })).toBeDisabled()
  })

  it('handles verify 409 safely and keeps status SUBMITTED', async () => {
    const user = userEvent.setup()

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'SUBMITTED' })]))
    mockVerifyAdminClaim.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'Only submitted claims may be verified',
          path: '/api/admin/claims/1/verify',
        },
      },
    })

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Verify' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Verify' }))

    expect(await screen.findByText('Only submitted claims may be verified')).toBeInTheDocument()
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
  })

  it('opens approve dialog, calls exact endpoint, and renders backend-approved amounts including zero', async () => {
    const user = userEvent.setup()

    mockListAdminClaims
      .mockResolvedValueOnce(makePage([claimFixture({ status: 'VERIFIED' })]))
      .mockResolvedValueOnce(
        makePage([
          claimFixture({
            status: 'APPROVED',
            approvedAmount: 0,
            patientResponsibility: 150,
          }),
        ]),
      )

    mockApproveAdminClaim.mockResolvedValue(
      claimFixture({
        status: 'APPROVED',
        approvedAmount: 0,
        patientResponsibility: 150,
      }),
    )

    renderPage()

    await screen.findByText('Claim Management')
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(await screen.findByText('Approve claim?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Approval' }))

    await waitFor(() => {
      expect(mockApproveAdminClaim).toHaveBeenCalledWith(1)
    })

    expect(await screen.findByText('Claim 1 was approved successfully.')).toBeInTheDocument()
    expect(screen.getByText('Approved Amount: $0.00')).toBeInTheDocument()
    expect(screen.getByText('Patient Responsibility: $150.00')).toBeInTheDocument()
  })

  it('prevents duplicate approval submissions', async () => {
    const user = userEvent.setup()

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'VERIFIED' })]))
    mockApproveAdminClaim.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    const confirmButton = await screen.findByRole('button', { name: 'Confirm Approval' })
    await user.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(mockApproveAdminClaim).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Approving...' })).toBeDisabled()
  })

  it('handles approve 409 safely and keeps status VERIFIED', async () => {
    const user = userEvent.setup()

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'VERIFIED' })]))
    mockApproveAdminClaim.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'Only verified claims may be approved',
          path: '/api/admin/claims/1/approve',
        },
      },
    })

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Approval' }))

    expect(await screen.findByText('Only verified claims may be approved')).toBeInTheDocument()
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0)
  })

  it('opens reject dialog, requires nonblank reason, sends exact body, and persists reason display', async () => {
    const user = userEvent.setup()

    mockListAdminClaims
      .mockResolvedValueOnce(makePage([claimFixture({ status: 'VERIFIED' })]))
      .mockResolvedValueOnce(
        makePage([
          claimFixture({
            status: 'REJECTED',
            rejectionReason: 'Claim documentation could not be verified.',
          }),
        ]),
      )

    mockRejectAdminClaim.mockResolvedValue(
      claimFixture({
        status: 'REJECTED',
        rejectionReason: 'Claim documentation could not be verified.',
      }),
    )

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    const rejectionDialog = await screen.findByRole('dialog', { name: 'Reject claim?' })
    expect(rejectionDialog).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }))
    expect(await screen.findByText('Rejection reason is required.')).toBeInTheDocument()

    await user.type(
      within(rejectionDialog).getByRole('textbox', { name: /rejection reason/i }),
      'Claim documentation could not be verified.',
    )
    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }))

    await waitFor(() => {
      expect(mockRejectAdminClaim).toHaveBeenCalledWith(1, {
        reason: 'Claim documentation could not be verified.',
      })
    })

    expect(await screen.findByText('Claim 1 was rejected.')).toBeInTheDocument()
    expect(screen.getByText('Rejection Reason: Claim documentation could not be verified.')).toBeInTheDocument()
  })

  it('shows reason character count and max length of 500', async () => {
    const user = userEvent.setup()
    const maxReason = 'A'.repeat(500)

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'VERIFIED' })]))

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    const rejectionDialog = await screen.findByRole('dialog', { name: 'Reject claim?' })

    const reasonInput = within(rejectionDialog).getByRole('textbox', { name: /rejection reason/i })
    fireEvent.change(reasonInput, { target: { value: maxReason } })

    expect(screen.getByText('500/500 characters')).toBeInTheDocument()
    expect(reasonInput).toHaveValue(maxReason)
  }, 10000)

  it('prevents duplicate rejection submissions', async () => {
    const user = userEvent.setup()

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'VERIFIED' })]))
    mockRejectAdminClaim.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    const rejectionDialog = await screen.findByRole('dialog', { name: 'Reject claim?' })
    await user.type(within(rejectionDialog).getByRole('textbox', { name: /rejection reason/i }), 'Insufficient docs')

    const confirmButton = screen.getByRole('button', { name: 'Confirm Rejection' })
    await user.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(mockRejectAdminClaim).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Rejecting...' })).toBeDisabled()
  })

  it('handles rejection 409 safely and keeps status VERIFIED', async () => {
    const user = userEvent.setup()

    mockListAdminClaims.mockResolvedValue(makePage([claimFixture({ status: 'VERIFIED' })]))
    mockRejectAdminClaim.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'Only verified claims may be rejected',
          path: '/api/admin/claims/1/reject',
        },
      },
    })

    renderPage()
    await screen.findByText('Claim Management')

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    const rejectionDialog = await screen.findByRole('dialog', { name: 'Reject claim?' })
    await user.type(within(rejectionDialog).getByRole('textbox', { name: /rejection reason/i }), 'Not eligible')
    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }))

    expect(await screen.findByText('Only verified claims may be rejected')).toBeInTheDocument()
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0)
  })

  it('renders mobile cards safely for long policy numbers and nullable amounts without NaN', async () => {
    mockListAdminClaims.mockResolvedValue(
      makePage([
        claimFixture({
          status: 'SUBMITTED',
          policyNumber: 'POL-WITH-VERY-LONG-IDENTIFIER-1234567890-ABCDEFGHIJ',
          approvedAmount: null,
          patientResponsibility: null,
        }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Claim Management')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/POL-WITH-VERY-LONG-IDENTIFIER/)).toBeInTheDocument()
    expect(screen.getByText('Approved Amount: Pending calculation')).toBeInTheDocument()
    expect(screen.getByText('Patient Responsibility: Pending calculation')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('NaN')
  })

  it('does not render sensitive JWT or password fields from payload', async () => {
    localStorage.setItem('careconnect360.auth.token', 'super-secret-jwt')

    mockListAdminClaims.mockResolvedValue(
      makePage([
        claimFixture({
          password: 'secret',
          passwordHash: 'hash-value',
          jwt: 'raw-jwt-token',
        }),
      ]),
    )

    renderPage()

    await screen.findByText('Claim Management')
    expect(document.body.textContent).not.toContain('super-secret-jwt')
    expect(document.body.textContent).not.toContain('hash-value')
    expect(document.body.textContent).not.toContain('raw-jwt-token')
  })
})
