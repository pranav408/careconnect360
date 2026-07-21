import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AppointmentBookingDialog } from './AppointmentBookingDialog'

const mockCreateAppointment = vi.fn()

vi.mock('../../api/appointmentApi', () => ({
  createAppointment: (...args: unknown[]) => mockCreateAppointment(...args),
}))

describe('AppointmentBookingDialog', () => {
  beforeEach(() => {
    mockCreateAppointment.mockReset()
  })

  it('books with selected doctorId, keeps local time, and excludes patientId/status from payload', async () => {
    const user = userEvent.setup()
    const onBooked = vi.fn()

    mockCreateAppointment.mockResolvedValue({
      appointmentId: 123,
      patientId: 22,
      patientName: 'Patient One',
      doctorId: 9,
      doctorName: 'Dr. Alpha',
      doctorSpecialization: 'Cardiology',
      appointmentDate: '2099-12-01',
      appointmentTime: '10:30:00',
      reason: 'Routine check-up',
      status: 'REQUESTED',
      createdAt: '2099-11-01T10:00:00',
    })

    render(
      <AppointmentBookingDialog
        doctor={{
          doctorId: 9,
          fullName: 'Dr. Alpha',
          specialization: 'Cardiology',
          licenseNumber: 'LIC-100',
          phone: '5551234567',
          clinicAddress: '100 Health Avenue',
          consultationFee: 150,
          availableForAppointments: true,
        }}
        open
        onClose={() => undefined}
        onBooked={onBooked}
      />,
    )

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement | null

    expect(dateInput).not.toBeNull()
    expect(timeInput).not.toBeNull()

    if (!dateInput || !timeInput) {
      throw new Error('Date/time inputs were not rendered')
    }

    await user.type(dateInput, '2099-12-01')
    await user.type(timeInput, '10:30')
    await user.type(screen.getByRole('textbox', { name: /Reason/i }), 'Routine check-up')
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }))

    await waitFor(() => {
      expect(mockCreateAppointment).toHaveBeenCalledTimes(1)
    })

    expect(mockCreateAppointment).toHaveBeenCalledWith({
      doctorId: 9,
      appointmentDate: '2099-12-01',
      appointmentTime: '10:30:00',
      reason: 'Routine check-up',
    })

    const payload = mockCreateAppointment.mock.calls[0][0] as Record<string, unknown>
    expect(payload.patientId).toBeUndefined()
    expect(payload.status).toBeUndefined()

    await waitFor(() => {
      expect(onBooked).toHaveBeenCalledWith(expect.objectContaining({ status: 'REQUESTED' }))
    })
  })
})
