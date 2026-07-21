import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminDashboardPage } from './AdminDashboardPage'

const mockGetAdminDashboard = vi.fn()

vi.mock('../../api/adminDashboardApi', () => ({
  getAdminDashboard: (...args: unknown[]) => mockGetAdminDashboard(...args),
}))

function dashboardFixture(overrides: Record<string, unknown> = {}) {
  return {
    totalPatientCount: 12,
    totalDoctorCount: 5,
    availableDoctorCount: 4,
    totalAppointmentCount: 18,
    appointmentCounts: [
      { status: 'REQUESTED', count: 2 },
      { status: 'CONFIRMED', count: 3 },
      { status: 'COMPLETED', count: 10 },
    ],
    policyCounts: [
      { status: 'PENDING', count: 1 },
      { status: 'ACTIVE', count: 8 },
    ],
    claimCounts: [
      { status: 'SUBMITTED', count: 1 },
      { status: 'APPROVED', count: 3 },
      { status: 'PAID', count: 4 },
    ],
    successfulPaymentCount: 6,
    failedPaymentCount: 2,
    totalSuccessfulPaymentAmount: 420,
    unreadNotificationCount: 7,
    recentAppointments: [
      {
        appointmentId: 101,
        appointmentDate: '2026-08-20',
        appointmentTime: '10:30:00',
        reason: 'Routine check-up',
        status: 'CONFIRMED',
        doctorId: 7,
        doctorName: 'Dr. Sarah Johnson',
        doctorSpecialization: 'Cardiology',
        patientId: 1,
        patientName: 'Example Patient',
        createdAt: '2026-07-12T09:15:30',
      },
    ],
    recentClaims: [
      {
        claimId: 42,
        appointmentId: 101,
        policyId: 11,
        policyNumber: 'POL-1001',
        requestedAmount: 150,
        approvedAmount: 80,
        patientResponsibility: 70,
        status: 'APPROVED',
        doctorName: 'Dr. Sarah Johnson',
        patientName: 'Example Patient',
        createdAt: '2026-07-12T11:22:33',
      },
    ],
    recentSuccessfulPayments: [
      {
        paymentId: 25,
        claimId: 42,
        appointmentId: 101,
        transactionReference: 'CC360-PAY-TEST',
        amount: 70,
        status: 'SUCCESS',
        failureReason: null,
        paidAt: '2026-07-12T14:20:00',
        patientName: 'Example Patient',
        createdAt: '2026-07-12T14:19:30',
      },
    ],
    averageSettlementTime: 'UNSUPPORTED',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboardPage />
    </MemoryRouter>,
  )
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    mockGetAdminDashboard.mockReset()
  })

  it('renders backend metrics, grouped status summaries, and recent activity', async () => {
    mockGetAdminDashboard.mockResolvedValue(dashboardFixture())

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Total Patients')).toBeInTheDocument()
    expect(screen.getByText('Total Doctors')).toBeInTheDocument()
    expect(screen.getByText('Available Doctors')).toBeInTheDocument()
    expect(screen.getByText('Total Appointments')).toBeInTheDocument()
    expect(screen.getByLabelText('REQUESTED count 2')).toBeInTheDocument()
    expect(screen.getByLabelText('ACTIVE count 8')).toBeInTheDocument()
    expect(screen.getByLabelText('APPROVED count 3')).toBeInTheDocument()
    expect(screen.getByText('$420.00')).toBeInTheDocument()
    expect(screen.getByText('Appointment Status Summary')).toBeInTheDocument()
    expect(screen.getByText('Insurance Policy Status Summary')).toBeInTheDocument()
    expect(screen.getByText('Claim Status Summary')).toBeInTheDocument()
    expect(screen.getByText('Recent Appointments')).toBeInTheDocument()
    expect(screen.getByText('Recent Claims')).toBeInTheDocument()
    expect(screen.getByText('Recent Successful Payments')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage Insurance' })).toHaveAttribute('href', '/admin/insurance')
    expect(screen.getByRole('link', { name: 'Manage Claims' })).toHaveAttribute('href', '/admin/claims')
    expect(screen.getByRole('link', { name: 'Manage Doctors' })).toHaveAttribute('href', '/admin/doctors')
  })

  it('renders missing status keys as zero and avoids NaN or undefined', async () => {
    mockGetAdminDashboard.mockResolvedValue(
      dashboardFixture({
        appointmentCounts: [{ status: 'REQUESTED', count: 1 }],
        policyCounts: [{ status: 'ACTIVE', count: 2 }],
        claimCounts: [{ status: 'PAID', count: 1 }],
        totalSuccessfulPaymentAmount: null,
        recentSuccessfulPayments: [],
      }),
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument()
  expect(screen.getByLabelText('REQUESTED count 1')).toBeInTheDocument()
    expect(screen.getByLabelText('CONFIRMED count 0')).toBeInTheDocument()
    expect(screen.getByLabelText('PENDING count 0')).toBeInTheDocument()
    expect(screen.getByLabelText('VERIFIED count 0')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.queryByText(/NaN|undefined|null/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Recent Successful Payments')).not.toBeInTheDocument()
  })

  it('shows loading and retryable error states', async () => {
    mockGetAdminDashboard.mockImplementation(() => new Promise(() => undefined))

    renderPage()

    expect(screen.getByLabelText('Loading admin dashboard')).toBeInTheDocument()
  })

  it('renders a safe retryable error state', async () => {
    mockGetAdminDashboard.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, statusText: 'Internal Server Error', data: {} },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Server unavailable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('keeps the layout free of table overflow patterns', async () => {
    mockGetAdminDashboard.mockResolvedValue(dashboardFixture({ recentSuccessfulPayments: [] }))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})