import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DoctorAppointmentsPage } from './DoctorAppointmentsPage'

const mockGetDoctorAppointments = vi.fn()
const mockConfirmDoctorAppointment = vi.fn()
const mockRejectDoctorAppointment = vi.fn()
const mockCompleteDoctorAppointment = vi.fn()

vi.mock('../../api/doctorAppointmentApi', () => ({
  getDoctorAppointments: (...args: unknown[]) => mockGetDoctorAppointments(...args),
  confirmDoctorAppointment: (...args: unknown[]) => mockConfirmDoctorAppointment(...args),
  rejectDoctorAppointment: (...args: unknown[]) => mockRejectDoctorAppointment(...args),
  completeDoctorAppointment: (...args: unknown[]) => mockCompleteDoctorAppointment(...args),
}))

function makePage(appointments: Array<Record<string, unknown>>) {
  return {
    content: appointments,
    totalElements: appointments.length,
    totalPages: 1,
    size: 8,
    number: 0,
    numberOfElements: appointments.length,
    first: true,
    last: true,
    empty: appointments.length === 0,
    sort: { empty: false, sorted: true, unsorted: false },
    pageable: {
      pageNumber: 0,
      pageSize: 8,
      sort: { empty: false, sorted: true, unsorted: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
  }
}

function appointmentFixture(overrides: Record<string, unknown> = {}) {
  return {
    appointmentId: 1,
    patientId: 100,
    patientName: 'Patient One',
    doctorId: 3,
    doctorName: 'Dr. Doctor',
    doctorSpecialization: 'Cardiology',
    appointmentDate: '2099-12-12',
    appointmentTime: '10:30:00',
    reason: 'Routine check-up',
    status: 'REQUESTED',
    createdAt: '2099-12-01T09:00:00',
    ...overrides,
  }
}

describe('DoctorAppointmentsPage', () => {
  beforeEach(() => {
    mockGetDoctorAppointments.mockReset()
    mockConfirmDoctorAppointment.mockReset()
    mockRejectDoctorAppointment.mockReset()
    mockCompleteDoctorAppointment.mockReset()
  })

  it('renders assigned appointments and preserves local time display', async () => {
    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture()]))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Patient One')).toBeInTheDocument()
    expect(screen.getByText('10:30 AM')).toBeInTheDocument()
  })

  it('sends selected status filter to backend query and resets page to first page', async () => {
    const user = userEvent.setup()
    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture()]))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(screen.getByRole('option', { name: 'Confirmed' }))

    await waitFor(() => {
      expect(mockGetDoctorAppointments).toHaveBeenLastCalledWith({
        status: 'CONFIRMED',
        page: 0,
        size: 8,
        sort: 'appointmentDate,asc',
      })
    })
  })

  it('shows loading and empty states safely', async () => {
    mockGetDoctorAppointments.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading doctor appointments')).toBeInTheDocument()
    expect(screen.queryByText('No assigned appointments found')).not.toBeInTheDocument()
  })

  it('renders empty state when no assigned appointments are returned', async () => {
    mockGetDoctorAppointments.mockResolvedValue(makePage([]))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No assigned appointments found')).toBeInTheDocument()
  })

  it('shows status-specific actions based on backend status rules', async () => {
    mockGetDoctorAppointments.mockResolvedValue(
      makePage([
        appointmentFixture({ appointmentId: 1, status: 'REQUESTED', patientName: 'Req' }),
        appointmentFixture({ appointmentId: 2, status: 'CONFIRMED', patientName: 'Con' }),
        appointmentFixture({ appointmentId: 3, status: 'COMPLETED', patientName: 'Done' }),
        appointmentFixture({ appointmentId: 4, status: 'REJECTED', patientName: 'Rej' }),
        appointmentFixture({ appointmentId: 5, status: 'CANCELLED', patientName: 'Can' }),
      ]),
    )

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Req')
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument()
    expect(screen.getAllByText('No workflow action available for this status.').length).toBeGreaterThanOrEqual(3)
  })

  it('confirms appointment through confirm endpoint and updates to CONFIRMED', async () => {
    const user = userEvent.setup()
    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture()]))
    mockConfirmDoctorAppointment.mockResolvedValue(appointmentFixture({ status: 'CONFIRMED' }))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Appointment' }))

    await waitFor(() => {
      expect(mockConfirmDoctorAppointment).toHaveBeenCalledWith(1)
    })

    expect(await screen.findByText('Appointment confirmed successfully.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Confirm appointment request' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument()
  })

  it('rejects appointment without request body and updates to REJECTED', async () => {
    const user = userEvent.setup()
    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture()]))
    mockRejectDoctorAppointment.mockResolvedValue(appointmentFixture({ status: 'REJECTED' }))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: 'Reject Appointment' }))

    await waitFor(() => {
      expect(mockRejectDoctorAppointment).toHaveBeenCalledWith(1)
      expect(mockRejectDoctorAppointment).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Appointment rejected successfully.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })

  it('completes appointment with single completion endpoint call and claim success message', async () => {
    const user = userEvent.setup()
    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture({ status: 'CONFIRMED' })]))
    mockCompleteDoctorAppointment.mockResolvedValue(appointmentFixture({ status: 'COMPLETED' }))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('button', { name: 'Complete' }))
    await user.click(screen.getByRole('button', { name: 'Complete Appointment' }))

    await waitFor(() => {
      expect(mockCompleteDoctorAppointment).toHaveBeenCalledWith(1)
      expect(mockCompleteDoctorAppointment).toHaveBeenCalledTimes(1)
    })

    expect(
      await screen.findByText('Appointment completed and claim submitted successfully.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
  })

  it('keeps status unchanged on 409 completion failure', async () => {
    const user = userEvent.setup()
    const confirmed = appointmentFixture({ status: 'CONFIRMED' })
    mockGetDoctorAppointments.mockResolvedValue(makePage([confirmed]))
    mockCompleteDoctorAppointment.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'Only confirmed appointments can be completed',
          path: '/api/doctor/appointments/1/complete',
        },
      },
    })

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('button', { name: 'Complete' }))
    await user.click(screen.getByRole('button', { name: 'Complete Appointment' }))

    expect(await screen.findByText('Only confirmed appointments can be completed')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Complete appointment' })).toBeInTheDocument()
  })

  it('displays safe 403 message', async () => {
    const user = userEvent.setup()
    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture()]))
    mockConfirmDoctorAppointment.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 403,
          error: 'Forbidden',
          message: 'You are not allowed to manage this appointment',
          path: '/api/doctor/appointments/1/confirm',
        },
      },
    })

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Appointment' }))

    expect(await screen.findByText('You are not allowed to manage this appointment.')).toBeInTheDocument()
  })

  it('prevents duplicate action submission', async () => {
    const user = userEvent.setup()

    mockGetDoctorAppointments.mockResolvedValue(makePage([appointmentFixture()]))
    mockConfirmDoctorAppointment.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Patient One')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    const confirmButton = screen.getByRole('button', { name: 'Confirm Appointment' })
    await user.click(confirmButton)
    fireEvent.click(confirmButton)

    expect(mockConfirmDoctorAppointment).toHaveBeenCalledTimes(1)
  })

  it('does not render JWT token values', async () => {
    localStorage.setItem('careconnect360.auth.token', 'jwt-sensitive-token')
    mockGetDoctorAppointments.mockResolvedValue(makePage([]))

    render(
      <MemoryRouter>
        <DoctorAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('No assigned appointments found')
    expect(document.body.textContent).not.toContain('jwt-sensitive-token')
  })
})
