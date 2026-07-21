import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMyActiveInsurancePolicy,
  getMyInsurancePolicies,
  submitInsurancePolicy,
} from './insuranceApi'

const mockPost = vi.fn()
const mockGet = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

describe('insuranceApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockGet.mockReset()
  })

  it('submits insurance policy with exact backend request fields', async () => {
    mockPost.mockResolvedValue({ data: { policyId: 10, status: 'PENDING' } })

    await submitInsurancePolicy({
      providerName: 'Aetna',
      policyNumber: 'CC360-POL-FRONTEND-2001',
      coveragePercentage: 75,
      deductibleAmount: 300,
      startDate: '2027-08-01',
      endDate: '2028-07-31',
    })

    expect(mockPost).toHaveBeenCalledWith('/insurance/policies', {
      providerName: 'Aetna',
      policyNumber: 'CC360-POL-FRONTEND-2001',
      coveragePercentage: 75,
      deductibleAmount: 300,
      startDate: '2027-08-01',
      endDate: '2028-07-31',
    })
  })

  it('loads authenticated patient policies and active policy using principal-based endpoints', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          {
            policyId: 1,
            providerName: 'United Healthcare',
            policyNumber: 'CC360-POL-1001',
            coveragePercentage: 80,
            deductibleAmount: 500,
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            status: 'ACTIVE',
          },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          policyId: 1,
          providerName: 'United Healthcare',
          policyNumber: 'CC360-POL-1001',
          coveragePercentage: 80,
          deductibleAmount: 500,
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          status: 'ACTIVE',
        },
      })

    await getMyInsurancePolicies()
    await getMyActiveInsurancePolicy()

    expect(mockGet).toHaveBeenNthCalledWith(1, '/insurance/policies/me', {
      params: undefined,
    })
    expect(mockGet).toHaveBeenNthCalledWith(2, '/insurance/policies/me/active')
  })
})
