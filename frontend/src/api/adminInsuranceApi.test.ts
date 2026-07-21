import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activateAdminInsurancePolicy,
  listAdminInsurancePolicies,
  rejectAdminInsurancePolicy,
} from './adminInsuranceApi'

const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

describe('adminInsuranceApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('lists policies with exact admin query parameters', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listAdminInsurancePolicies({
      status: 'PENDING',
      patientEmail: 'patient@example.com',
      policyNumber: 'CC360-POL-1001',
      page: 2,
      size: 20,
      sort: 'createdAt,desc',
    })

    expect(mockGet).toHaveBeenCalledWith('/admin/insurance/policies', {
      params: {
        status: 'PENDING',
        patientEmail: 'patient@example.com',
        policyNumber: 'CC360-POL-1001',
        page: 2,
        size: 20,
        sort: 'createdAt,desc',
      },
    })
  })

  it('activates policy with exact endpoint and no invented body', async () => {
    mockPatch.mockResolvedValue({ data: { policyId: 11, status: 'ACTIVE' } })

    await activateAdminInsurancePolicy(11)

    expect(mockPatch).toHaveBeenCalledWith('/admin/insurance/policies/11/activate')
  })

  it('rejects policy with exact endpoint and reason body', async () => {
    mockPatch.mockResolvedValue({ data: { policyId: 11, status: 'REJECTED' } })

    await rejectAdminInsurancePolicy(11, {
      reason: 'Policy information could not be verified',
    })

    expect(mockPatch).toHaveBeenCalledWith('/admin/insurance/policies/11/reject', {
      reason: 'Policy information could not be verified',
    })
  })
})
