import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelAppointment, createAppointment, getMyAppointments } from './appointmentApi'

const mockPost = vi.fn()
const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

describe('appointmentApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('creates appointment with local date/time payload', async () => {
    mockPost.mockResolvedValue({ data: { appointmentId: 1 } })

    await createAppointment({
      doctorId: 7,
      appointmentDate: '2099-12-12',
      appointmentTime: '10:30:00',
      reason: 'Routine check-up',
    })

    expect(mockPost).toHaveBeenCalledWith('/appointments', {
      doctorId: 7,
      appointmentDate: '2099-12-12',
      appointmentTime: '10:30:00',
      reason: 'Routine check-up',
    })
  })

  it('loads authenticated patient appointments and can cancel appointment', async () => {
    mockGet.mockResolvedValue({ data: { content: [] } })
    mockPatch.mockResolvedValue({ data: { appointmentId: 12, status: 'CANCELLED' } })

    await getMyAppointments({ status: 'REQUESTED', page: 0, size: 8, sort: 'appointmentDate,desc' })
    await cancelAppointment(12)

    expect(mockGet).toHaveBeenCalledWith('/appointments/me', {
      params: {
        status: 'REQUESTED',
        page: 0,
        size: 8,
        sort: 'appointmentDate,desc',
      },
    })
    expect(mockPatch).toHaveBeenCalledWith('/appointments/12/cancel')
  })
})
