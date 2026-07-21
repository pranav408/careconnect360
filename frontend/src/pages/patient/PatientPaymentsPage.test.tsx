import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientPaymentsPage } from './PatientPaymentsPage'

const mockListMyPayments = vi.fn()
const mockCreateClaimPayment = vi.fn()
const mockListMyClaims = vi.fn()

vi.mock('../../api/patientPaymentApi', () => ({
  listMyPayments: (...args: unknown[]) => mockListMyPayments(...args),
  createClaimPayment: (...args: unknown[]) => mockCreateClaimPayment(...args),
}))

vi.mock('../../api/patientClaimApi', () => ({
  listMyClaims: (...args: unknown[]) => mockListMyClaims(...args),
  getMyClaimById: vi.fn(),
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
    policyNumber: 'POL-1001-LONG-000000000001',
    patientId: 21,
    patientName: 'Anita Rao',
    doctorId: 31,
    doctorName: 'Dr. Sarah Johnson',
    requestedAmount: 150,
    approvedAmount: 0,
    patientResponsibility: 150,
    rejectionReason: null,
    status: 'APPROVED',
    createdAt: '2026-07-14T10:00:00',
    updatedAt: '2026-07-14T10:00:00',
    ...overrides,
  }
}

function paymentFixture(overrides: Record<string, unknown> = {}) {
  return {
    paymentId: 700,
    claimId: 77,
    appointmentId: 177,
    transactionReference: 'CC360-PAY-ABCDEF1234567890ABCDEF1234567890',
    amount: 88,
    status: 'SUCCESS',
    paidAt: '2026-07-14T11:20:00',
    failureReason: null,
    createdAt: '2026-07-14T11:19:00',
    updatedAt: '2026-07-14T11:20:00',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PatientPaymentsPage />
    </MemoryRouter>,
  )
}

let viewportWidth = 1024

function matchesQuery(query: string): boolean {
  const minMatch = query.match(/min-width:\s*([0-9.]+)px/)
  const maxMatch = query.match(/max-width:\s*([0-9.]+)px/)

  const min = minMatch ? Number(minMatch[1]) : null
  const max = maxMatch ? Number(maxMatch[1]) : null

  if (min !== null && viewportWidth < min) {
    return false
  }

  if (max !== null && viewportWidth > max) {
    return false
  }

  return true
}

function apiConflictError(message: string) {
  return {
    isAxiosError: true,
    response: {
      status: 409,
      statusText: 'Conflict',
      data: {
        timestamp: '2026-07-14T12:00:00Z',
        status: 409,
        error: 'Conflict',
        message,
        path: '/api/payments/claims/1',
      },
    },
  }
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: matchesQuery(query),
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

describe('PatientPaymentsPage', () => {
  beforeEach(() => {
    viewportWidth = 1024
    mockListMyPayments.mockReset()
    mockCreateClaimPayment.mockReset()
    mockListMyClaims.mockReset()

    mockListMyPayments.mockResolvedValue(makePage([]))
    mockListMyClaims.mockResolvedValue(makePage([]))
  })

  it('shows pay action only for eligible approved claims', async () => {
    mockListMyPayments
      .mockResolvedValueOnce(makePage([paymentFixture({ claimId: 3, status: 'SUCCESS' })]))
      .mockResolvedValueOnce(makePage([paymentFixture({ claimId: 3, status: 'SUCCESS' })]))

    mockListMyClaims.mockResolvedValue(
      makePage([
        claimFixture({ claimId: 1, status: 'APPROVED', patientResponsibility: 150 }),
        claimFixture({ claimId: 2, status: 'APPROVED', patientResponsibility: 0 }),
        claimFixture({ claimId: 3, status: 'APPROVED', patientResponsibility: 55 }),
        claimFixture({ claimId: 4, status: 'SUBMITTED', patientResponsibility: 60 }),
      ]),
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeInTheDocument()

    const payButtons = screen.getAllByRole('button', { name: 'Pay' })
    expect(payButtons).toHaveLength(1)
    expect(screen.getAllByText('No payment is due for this claim.').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Payment already recorded/).length).toBeGreaterThan(0)
  })

  it('opens payment dialog with safe claim fields and no sensitive credential inputs', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))
    mockListMyPayments.mockResolvedValue(makePage([]))

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Pay' }))

    const dialog = await screen.findByRole('dialog', { name: 'Pay claim #1' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Claim ID: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Appointment ID: 101')).toBeInTheDocument()
    expect(within(dialog).getByText('Requested Amount: $150.00')).toBeInTheDocument()
    expect(within(dialog).getByText('Approved Amount: $0.00')).toBeInTheDocument()
    expect(within(dialog).getByText('Patient Responsibility: $150.00')).toBeInTheDocument()

    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/bank account/i)).not.toBeInTheDocument()
  })

  it('sends exact status, page, size, and sort params for payment history', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([]))
    mockListMyPayments.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByRole('heading', { name: 'Payments' })

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Failed' }))

    await user.click(screen.getByLabelText('Page Size'))
    await user.click(screen.getByRole('option', { name: '20' }))

    await user.click(screen.getByLabelText('Sort'))
    await user.click(screen.getByRole('option', { name: 'Amount lowest first' }))

    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(
        mockListMyPayments.mock.calls.some(
          (call) =>
            call[0]?.status === 'FAILED' &&
            call[0]?.page === 0 &&
            call[0]?.size === 20 &&
            call[0]?.sort === 'amount,asc',
        ),
      ).toBe(true)
    })
  })

  it('submits payment once while processing and sends exact backend payload', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))
    mockListMyPayments.mockResolvedValue(makePage([]))

    mockCreateClaimPayment.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Pay' }))

    const confirmButton = await screen.findByRole('button', { name: 'Confirm payment' })
    await user.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(mockCreateClaimPayment).toHaveBeenCalledTimes(1)
    expect(mockCreateClaimPayment).toHaveBeenCalledWith(1, {
      outcome: 'SUCCESS',
    })
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled()
  })

  it('processes successful payment and refreshes history and claim eligibility', async () => {
    const user = userEvent.setup()

    mockListMyClaims
      .mockResolvedValueOnce(makePage([claimFixture({ claimId: 1, status: 'APPROVED' })]))
      .mockResolvedValueOnce(makePage([]))

    mockListMyPayments
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValueOnce(makePage([paymentFixture({ paymentId: 801, claimId: 1, amount: 150, status: 'SUCCESS' })]))
      .mockResolvedValueOnce(makePage([paymentFixture({ paymentId: 801, claimId: 1, amount: 150, status: 'SUCCESS' })]))

    mockCreateClaimPayment.mockResolvedValue(
      paymentFixture({
        paymentId: 801,
        claimId: 1,
        amount: 150,
        status: 'SUCCESS',
        transactionReference: 'CC360-PAY-SUCCESS-1',
      }),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Pay' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm payment' }))

    const dialog = await screen.findByRole('dialog', { name: 'Pay claim #1' })
    expect(within(dialog).getByText('Status: Success')).toBeInTheDocument()
    expect(within(dialog).getByText('Amount: $150.00')).toBeInTheDocument()
    expect(within(dialog).getByText('Transaction Reference: CC360-PAY-SUCCESS-1')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeInTheDocument()
    })
  })

  it('shows failed payment status and fallback failure reason when missing', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))
    mockListMyPayments
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValueOnce(
        makePage([
          paymentFixture({ paymentId: 901, claimId: 1, status: 'FAILED', failureReason: null, amount: 150 }),
        ]),
      )
      .mockResolvedValueOnce(
        makePage([
          paymentFixture({ paymentId: 901, claimId: 1, status: 'FAILED', failureReason: null, amount: 150 }),
        ]),
      )

    mockCreateClaimPayment.mockResolvedValue(
      paymentFixture({ paymentId: 901, claimId: 1, status: 'FAILED', failureReason: null, amount: 150 }),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Pay' }))

    await user.click(screen.getByLabelText('Mock outcome'))
    await user.click(screen.getByRole('option', { name: 'Failure' }))
    await user.type(screen.getByLabelText('Failure reason'), 'Simulated gateway timeout')

    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    const dialog = await screen.findByRole('dialog', { name: 'Pay claim #1' })
    expect(within(dialog).getByText('Status: Failed')).toBeInTheDocument()
    expect(within(dialog).getByText('Failure Reason: Payment was not completed.')).toBeInTheDocument()
  })

  it('handles duplicate-payment conflict safely without false success', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))
    mockListMyPayments.mockResolvedValue(makePage([]))
    mockCreateClaimPayment.mockRejectedValue(apiConflictError('A payment already exists for this claim'))

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Pay' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    expect(await screen.findByText('A payment already exists for this claim')).toBeInTheDocument()
    expect(screen.queryByText('Status: Success')).not.toBeInTheDocument()
  })

  it('renders payment detail dialog and safe fields from history list data', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([]))
    mockListMyPayments.mockResolvedValue(
      makePage([
        paymentFixture({
          paymentId: 777,
          claimId: 555,
          amount: 0,
          status: 'FAILED',
          failureReason: null,
          transactionReference: 'CC360-PAY-VERY-LONG-REFERENCE-000000000000000000000000000000',
        }),
      ]),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Review payment' }))

    const dialog = await screen.findByRole('dialog', { name: 'Payment #777' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Amount: $0.00')).toBeInTheDocument()
    expect(within(dialog).getByText('Failure Reason: Payment was not completed.')).toBeInTheDocument()
    expect(screen.queryByText(/password|passwordHash|Bearer|jwt/i)).not.toBeInTheDocument()
  })

  it('renders mobile cards without desktop history table', async () => {
    viewportWidth = 375

    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))
    mockListMyPayments.mockResolvedValue(makePage([paymentFixture()]))

    renderPage()

    expect(await screen.findByText('Policy Number: POL-1001-LONG-000000000001')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Patient payment history table' })).not.toBeInTheDocument()
  })
})
