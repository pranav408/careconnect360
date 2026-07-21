import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyPatientProfile, updateMyPatientProfile } from './patientProfileApi'

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}))

describe('patientProfileApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPut.mockReset()
  })

  it('loads the authenticated patient profile from the exact principal-based endpoint', async () => {
    mockGet.mockResolvedValue({ data: { patientId: 1, fullName: 'Example Patient' } })

    await getMyPatientProfile()

    expect(mockGet).toHaveBeenCalledWith('/patients/me')
  })

  it('updates the authenticated patient profile with only supported request fields', async () => {
    mockPut.mockResolvedValue({ data: { patientId: 1, fullName: 'Updated Patient' } })

    await updateMyPatientProfile({
      fullName: 'Updated Patient',
      phone: '5552222222',
      address: '100 Main St',
      dateOfBirth: '1990-01-15',
      gender: 'FEMALE',
    })

    expect(mockPut).toHaveBeenCalledWith('/patients/me', {
      fullName: 'Updated Patient',
      phone: '5552222222',
      address: '100 Main St',
      dateOfBirth: '1990-01-15',
      gender: 'FEMALE',
    })

    const payload = mockPut.mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload.patientId).toBeUndefined()
    expect(payload.userId).toBeUndefined()
    expect(payload.patientEmail).toBeUndefined()
    expect(payload.role).toBeUndefined()
  })
})