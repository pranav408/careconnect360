import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientClaimsPage } from './PatientClaimsPage'

const mockListMyClaims = vi.fn()
const mockGetMyClaimById = vi.fn()

vi.mock('../../api/patientClaimApi', () => ({
  listMyClaims: (...args: unknown[]) => mockListMyClaims(...args),
  getMyClaimById: (...args: unknown[]) => mockGetMyClaimById(...args),
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
    policyNumber: 'CC360-LONG-POLICY-10000000000000000001',
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
      <PatientClaimsPage />
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

describe('PatientClaimsPage', () => {
  beforeEach(() => {
    viewportWidth = 1024
    mockListMyClaims.mockReset()
    mockGetMyClaimById.mockReset()
  })

  it('renders backend claims with status chips and no admin actions', async () => {
    mockListMyClaims.mockResolvedValue(
      makePage([
        claimFixture({ status: 'SUBMITTED' }),
        claimFixture({ claimId: 2, status: 'VERIFIED' }),
        claimFixture({ claimId: 3, status: 'APPROVED', approvedAmount: 100, patientResponsibility: 50 }),
        claimFixture({ claimId: 4, status: 'REJECTED', rejectionReason: 'Coverage prerequisites were not met' }),
        claimFixture({ claimId: 5, status: 'PAID', approvedAmount: 110, patientResponsibility: 40 }),
      ]),
    )
    mockGetMyClaimById.mockResolvedValue(claimFixture())

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Claims' })).toBeInTheDocument()
    expect(screen.getByText('Claim #1')).toBeInTheDocument()
    expect(screen.getAllByText('Current page').length).toBeGreaterThan(0)
    expect(screen.getByText('Approved Amount: $100.00')).toBeInTheDocument()
    expect(screen.getByText('Patient Responsibility: $50.00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeInTheDocument()
  })

  it('renders pending calculation safely and never shows NaN/null/undefined', async () => {
    mockListMyClaims.mockResolvedValue(
      makePage([
        claimFixture({ status: 'SUBMITTED', approvedAmount: null, patientResponsibility: null }),
        claimFixture({ claimId: 2, status: 'VERIFIED', approvedAmount: null, patientResponsibility: null }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Claim #1')).toBeInTheDocument()
    expect(screen.getAllByText('Approved Amount: Pending calculation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Patient Responsibility: Pending calculation').length).toBeGreaterThan(0)
    expect(screen.queryByText('$NaN')).not.toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
  })

  it('renders approved zero amount exactly as $0.00', async () => {
    mockListMyClaims.mockResolvedValue(
      makePage([
        claimFixture({
          status: 'APPROVED',
          approvedAmount: 0,
          patientResponsibility: 150,
        }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Approved Amount: $0.00')).toBeInTheDocument()
    expect(screen.getByText('Patient Responsibility: $150.00')).toBeInTheDocument()
  })

  it('renders rejection reason and fallback when reason is missing', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(
      makePage([
        claimFixture({ claimId: 10, status: 'REJECTED', rejectionReason: 'Claim was rejected for missing prerequisites.' }),
        claimFixture({ claimId: 11, status: 'REJECTED', rejectionReason: null }),
      ]),
    )

    mockGetMyClaimById.mockImplementation(async (claimId: number) => {
      if (claimId === 10) {
        return claimFixture({ claimId: 10, status: 'REJECTED', rejectionReason: 'Claim was rejected for missing prerequisites.' })
      }

      return claimFixture({ claimId: 11, status: 'REJECTED', rejectionReason: null })
    })

    renderPage()

    const reviewButtons = await screen.findAllByRole('button', { name: 'Review' })
    await user.click(reviewButtons[0])

    expect(await screen.findByText('Rejection Reason: Claim was rejected for missing prerequisites.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.click((await screen.findAllByRole('button', { name: 'Review' }))[1])
    expect(await screen.findByText('Rejection Reason: No rejection reason was provided.')).toBeInTheDocument()
  })

  it('sends exact status, page, size, and safe sort fields', async () => {
    const user = userEvent.setup()

    mockListMyClaims.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByRole('heading', { name: 'Claims' })

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Submitted' }))

    await user.click(screen.getByLabelText('Page Size'))
    await user.click(screen.getByRole('option', { name: '20' }))

    await user.click(screen.getByLabelText('Sort'))
    await user.click(screen.getByRole('option', { name: 'Claim ID ascending' }))

    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListMyClaims).toHaveBeenLastCalledWith({
        status: 'SUBMITTED',
        page: 0,
        size: 20,
        sort: 'claimId,asc',
      })
    })

    const query = mockListMyClaims.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(query.patientId).toBeUndefined()
    expect(query.patientEmail).toBeUndefined()
    expect(query.appointmentId).toBeUndefined()
    expect(query.policyNumber).toBeUndefined()
  })

  it('pagination preserves filters and page resets on filter changes', async () => {
    const user = userEvent.setup()

    mockListMyClaims
      .mockResolvedValueOnce(makePage([claimFixture()], { totalElements: 11, totalPages: 2, number: 0 }))
      .mockResolvedValueOnce(makePage([claimFixture()], { totalElements: 11, totalPages: 2, number: 0 }))
      .mockResolvedValueOnce(makePage([claimFixture({ claimId: 2 })], { totalElements: 11, totalPages: 2, number: 1 }))
      .mockResolvedValueOnce(makePage([claimFixture({ claimId: 3, status: 'APPROVED' })], { totalElements: 1, totalPages: 1, number: 0 }))

    renderPage()
    await screen.findByRole('heading', { name: 'Claims' })

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Submitted' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListMyClaims).toHaveBeenLastCalledWith({
        status: 'SUBMITTED',
        page: 0,
        size: 10,
        sort: 'createdAt,desc',
      })
    })

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))

    await waitFor(() => {
      expect(mockListMyClaims).toHaveBeenLastCalledWith({
        status: 'SUBMITTED',
        page: 1,
        size: 10,
        sort: 'createdAt,desc',
      })
    })

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Approved' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListMyClaims).toHaveBeenLastCalledWith({
        status: 'APPROVED',
        page: 0,
        size: 10,
        sort: 'createdAt,desc',
      })
    })
  })

  it('clear filters resets query and shows filtered empty state action', async () => {
    const user = userEvent.setup()
    mockListMyClaims.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByRole('heading', { name: 'Claims' })

    await user.click(screen.getByLabelText('Status'))
    await user.click(screen.getByRole('option', { name: 'Approved' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No approved claims')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Clear Filters' })[0])

    await waitFor(() => {
      expect(mockListMyClaims).toHaveBeenLastCalledWith({
        page: 0,
        size: 10,
        sort: 'createdAt,desc',
      })
    })
  })

  it('opens review dialog and displays safe claim fields with no admin workflow actions', async () => {
    const user = userEvent.setup()
    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))
    mockGetMyClaimById.mockResolvedValue(
      claimFixture({
        claimId: 1,
        status: 'SUBMITTED',
      }),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Review' }))

    const dialog = await screen.findByRole('dialog', { name: 'Claim #1' })
    expect(within(dialog).getByText('Appointment ID: 101')).toBeInTheDocument()
    expect(within(dialog).getByText('Doctor: Dr. Sarah Johnson')).toBeInTheDocument()
    expect(within(dialog).getByText('Requested Amount: $150.00')).toBeInTheDocument()
    expect(within(dialog).getByText('Approved Amount: Pending calculation')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()

    expect(screen.queryByText('Bearer')).not.toBeInTheDocument()
    expect(screen.queryByText(/passwordHash|password|insurancePolicy|appointment\s*:\s*\{/i)).not.toBeInTheDocument()
  })

  it('renders mobile cards and long policy numbers accessibly', async () => {
    viewportWidth = 375
    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))

    renderPage()

    expect(await screen.findByText('Policy Number: CC360-LONG-POLICY-10000000000000000001')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Patient claims table' })).not.toBeInTheDocument()
  })

  it('renders desktop table layout when viewport is wide', async () => {
    viewportWidth = 1400
    mockListMyClaims.mockResolvedValue(makePage([claimFixture()]))

    renderPage()

    expect(await screen.findByRole('table', { name: 'Patient claims table' })).toBeInTheDocument()
    expect(screen.getByText('CC360-LONG-POLICY-10000000000000000001')).toBeInTheDocument()
  })
})
