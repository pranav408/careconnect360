import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyClaimById, listMyClaims } from './patientClaimApi'

const mockGet = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

describe('patientClaimApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls authenticated patient claims endpoint with supported query params only', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listMyClaims({
      status: 'SUBMITTED',
      page: 1,
      size: 20,
      sort: 'createdAt,desc',
    })

    expect(mockGet).toHaveBeenCalledWith('/claims/me', {
      params: {
        status: 'SUBMITTED',
        page: 1,
        size: 20,
        sort: 'createdAt,desc',
      },
    })

    const callParams = mockGet.mock.calls[0]?.[1]?.params as Record<string, unknown>
    expect(callParams.patientId).toBeUndefined()
    expect(callParams.patientEmail).toBeUndefined()
    expect(callParams.userId).toBeUndefined()
    expect(callParams.role).toBeUndefined()
    expect(callParams.adminId).toBeUndefined()
  })

  it('omits empty unsupported parameters by sending no params object', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listMyClaims()

    expect(mockGet).toHaveBeenCalledWith('/claims/me', {
      params: undefined,
    })
  })

  it('calls patient-authorized claim detail endpoint exactly', async () => {
    mockGet.mockResolvedValue({ data: { claimId: 11, status: 'SUBMITTED' } })

    await getMyClaimById(11)

    expect(mockGet).toHaveBeenCalledWith('/claims/11')
  })
})
