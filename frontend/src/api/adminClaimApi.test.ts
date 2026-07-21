import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveAdminClaim,
  listAdminClaims,
  rejectAdminClaim,
  verifyAdminClaim,
} from './adminClaimApi'

const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

describe('adminClaimApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('lists claims with exact admin query parameters', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listAdminClaims({
      status: 'SUBMITTED',
      patientEmail: 'patient@example.com',
      policyNumber: 'POL-1001',
      appointmentId: 101,
      page: 2,
      size: 20,
      sort: 'createdAt,desc',
    })

    expect(mockGet).toHaveBeenCalledWith('/admin/claims', {
      params: {
        status: 'SUBMITTED',
        patientEmail: 'patient@example.com',
        policyNumber: 'POL-1001',
        appointmentId: 101,
        page: 2,
        size: 20,
        sort: 'createdAt,desc',
      },
    })
  })

  it('verifies claim with exact endpoint and no invented body', async () => {
    mockPatch.mockResolvedValue({ data: { claimId: 11, status: 'VERIFIED' } })

    await verifyAdminClaim(11)

    expect(mockPatch).toHaveBeenCalledWith('/admin/claims/11/verify')
  })

  it('approves claim with exact endpoint and no financial body', async () => {
    mockPatch.mockResolvedValue({ data: { claimId: 11, status: 'APPROVED' } })

    await approveAdminClaim(11)

    expect(mockPatch).toHaveBeenCalledWith('/admin/claims/11/approve')
  })

  it('rejects claim with exact endpoint and reason body', async () => {
    mockPatch.mockResolvedValue({ data: { claimId: 11, status: 'REJECTED' } })

    await rejectAdminClaim(11, {
      reason: 'The submitted claim could not be verified.',
    })

    expect(mockPatch).toHaveBeenCalledWith('/admin/claims/11/reject', {
      reason: 'The submitted claim could not be verified.',
    })
  })
})
