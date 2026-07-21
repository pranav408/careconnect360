import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyDoctorProfile, updateMyDoctorProfile } from './doctorProfileApi'

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}))

describe('doctorProfileApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPut.mockReset()
  })

  it('loads authenticated doctor profile from the exact principal-based endpoint', async () => {
    mockGet.mockResolvedValue({
      data: {
        doctorId: 9,
        email: 'doctor@example.com',
        fullName: 'Dr. Ada',
        specialization: 'Cardiology',
        phone: '5551234567',
        consultationFee: 150,
        available: true,
        accountStatus: 'ACTIVE',
      },
    })

    await getMyDoctorProfile()

    expect(mockGet).toHaveBeenCalledWith('/doctors/me')

    const requestConfig = mockGet.mock.calls[0]?.[1] as Record<string, unknown> | undefined
    expect(requestConfig?.doctorId).toBeUndefined()
    expect(requestConfig?.userId).toBeUndefined()
    expect(requestConfig?.email).toBeUndefined()
    expect(requestConfig?.role).toBeUndefined()
    expect(requestConfig?.adminId).toBeUndefined()
  })

  it('updates authenticated doctor profile through exact /doctors/me payload without ownership fields', async () => {
    const payload = {
      fullName: 'Dr. Ada Lovelace',
      specialization: 'Neurology',
      phone: '5550001111',
      consultationFee: 220,
      available: false,
    }

    mockPut.mockResolvedValue({
      data: {
        doctorId: 9,
        email: 'doctor@example.com',
        ...payload,
        accountStatus: 'ACTIVE',
      },
    })

    await updateMyDoctorProfile(payload)

    expect(mockPut).toHaveBeenCalledWith('/doctors/me', payload)

    const sentPayload = mockPut.mock.calls[0]?.[1] as Record<string, unknown>
    expect(sentPayload.doctorId).toBeUndefined()
    expect(sentPayload.userId).toBeUndefined()
    expect(sentPayload.email).toBeUndefined()
    expect(sentPayload.role).toBeUndefined()
    expect(sentPayload.accountStatus).toBeUndefined()
    expect(sentPayload.password).toBeUndefined()
    expect(sentPayload.passwordHash).toBeUndefined()
    expect(sentPayload.jwt).toBeUndefined()
  })
})