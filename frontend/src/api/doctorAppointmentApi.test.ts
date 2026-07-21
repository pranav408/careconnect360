import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeDoctorAppointment,
  confirmDoctorAppointment,
  getDoctorAppointments,
  rejectDoctorAppointment,
} from './doctorAppointmentApi'

const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

describe('doctorAppointmentApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('loads doctor appointments with backend query parameters', async () => {
    mockGet.mockResolvedValue({ data: { content: [] } })

    await getDoctorAppointments({
      status: 'REQUESTED',
      page: 0,
      size: 8,
      sort: 'appointmentDate,asc',
    })

    expect(mockGet).toHaveBeenCalledWith('/doctor/appointments', {
      params: {
        status: 'REQUESTED',
        page: 0,
        size: 8,
        sort: 'appointmentDate,asc',
      },
    })
  })

  it('calls exact doctor action endpoints', async () => {
    mockPatch.mockResolvedValue({ data: { appointmentId: 5 } })

    await confirmDoctorAppointment(5)
    await rejectDoctorAppointment(5)
    await completeDoctorAppointment(5)

    expect(mockPatch).toHaveBeenNthCalledWith(1, '/doctor/appointments/5/confirm')
    expect(mockPatch).toHaveBeenNthCalledWith(2, '/doctor/appointments/5/reject')
    expect(mockPatch).toHaveBeenNthCalledWith(3, '/doctor/appointments/5/complete')
    expect(mockPatch).toHaveBeenCalledTimes(3)
  })
})
