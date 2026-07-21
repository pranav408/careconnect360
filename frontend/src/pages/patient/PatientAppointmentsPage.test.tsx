import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientAppointmentsPage } from './PatientAppointmentsPage'

const mockGetMyAppointments = vi.fn()
const mockCancelAppointment = vi.fn()

vi.mock('../../api/appointmentApi', () => ({
  getMyAppointments: (...args: unknown[]) => mockGetMyAppointments(...args),
  cancelAppointment: (...args: unknown[]) => mockCancelAppointment(...args),
}))

function makePage(appointments: Array<Record<string, unknown>>) {
  return {
    content: appointments,
    totalPages: 1,
  }
}

describe('PatientAppointmentsPage', () => {
  beforeEach(() => {
    mockGetMyAppointments.mockReset()
    mockCancelAppointment.mockReset()
  })

  it('renders patient appointments and only shows cancel action for REQUESTED/CONFIRMED', async () => {
    mockGetMyAppointments.mockResolvedValue(
      makePage([
        {
          appointmentId: 1,
          patientId: 10,
          patientName: 'Patient One',
          doctorId: 2,
          doctorName: 'Dr. Request',
          doctorSpecialization: 'Cardiology',
          appointmentDate: '2099-12-12',
          appointmentTime: '10:30:00',
          reason: 'Routine check-up',
          status: 'REQUESTED',
          createdAt: '2099-12-01T09:00:00',
        },
        {
          appointmentId: 2,
          patientId: 10,
          patientName: 'Patient One',
          doctorId: 3,
          doctorName: 'Dr. Done',
          doctorSpecialization: 'Neurology',
          appointmentDate: '2099-10-12',
          appointmentTime: '10:30:00',
          reason: 'Follow-up',
          status: 'COMPLETED',
          createdAt: '2099-10-01T09:00:00',
        },
      ]),
    )

    render(
      <MemoryRouter>
        <PatientAppointmentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Dr. Request')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cancel Appointment' })).toHaveLength(1)
    expect(screen.getByText('Action: Completed appointments cannot be cancelled.')).toBeInTheDocument()
  })

  it('updates status after successful cancellation without full page reload', async () => {
    const user = userEvent.setup()

    mockGetMyAppointments.mockResolvedValue(
      makePage([
        {
          appointmentId: 9,
          patientId: 10,
          patientName: 'Patient One',
          doctorId: 2,
          doctorName: 'Dr. Request',
          doctorSpecialization: 'Cardiology',
          appointmentDate: '2099-12-12',
          appointmentTime: '10:30:00',
          reason: 'Routine check-up',
          status: 'REQUESTED',
          createdAt: '2099-12-01T09:00:00',
        },
      ]),
    )

    mockCancelAppointment.mockResolvedValue({
      appointmentId: 9,
      patientId: 10,
      patientName: 'Patient One',
      doctorId: 2,
      doctorName: 'Dr. Request',
      doctorSpecialization: 'Cardiology',
      appointmentDate: '2099-12-12',
      appointmentTime: '10:30:00',
      reason: 'Routine check-up',
      status: 'CANCELLED',
      createdAt: '2099-12-01T09:00:00',
    })

    render(
      <MemoryRouter>
        <PatientAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Dr. Request')
    await user.click(screen.getByRole('button', { name: 'Cancel Appointment' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Cancel' }))

    await waitFor(() => {
      expect(mockCancelAppointment).toHaveBeenCalledWith(9)
    })

    expect(await screen.findByText('Appointment cancelled successfully with status CANCELLED.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel Appointment' })).not.toBeInTheDocument()
  })

  it('shows safe conflict message when backend returns 409 cancellation error', async () => {
    const user = userEvent.setup()

    mockGetMyAppointments.mockResolvedValue(
      makePage([
        {
          appointmentId: 3,
          patientId: 10,
          patientName: 'Patient One',
          doctorId: 2,
          doctorName: 'Dr. Request',
          doctorSpecialization: 'Cardiology',
          appointmentDate: '2099-12-12',
          appointmentTime: '10:30:00',
          reason: 'Routine check-up',
          status: 'REQUESTED',
          createdAt: '2099-12-01T09:00:00',
        },
      ]),
    )

    mockCancelAppointment.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          timestamp: '2026-07-13T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'Only requested or confirmed appointments can be cancelled',
          path: '/api/appointments/3/cancel',
        },
      },
    })

    render(
      <MemoryRouter>
        <PatientAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Dr. Request')
    await user.click(screen.getByRole('button', { name: 'Cancel Appointment' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Cancel' }))

    expect(
      await screen.findByText('Only requested or confirmed appointments can be cancelled'),
    ).toBeInTheDocument()
  })

  it('does not render sensitive JWT token values', async () => {
    localStorage.setItem('careconnect360.auth.token', 'very-sensitive-jwt-token')
    mockGetMyAppointments.mockResolvedValue(makePage([]))

    render(
      <MemoryRouter>
        <PatientAppointmentsPage />
      </MemoryRouter>,
    )

    await screen.findByText('No appointments yet')
    expect(document.body.textContent).not.toContain('very-sensitive-jwt-token')
  })
})
