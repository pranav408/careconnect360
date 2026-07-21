import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClaimPayment, listMyPayments } from './patientPaymentApi'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

describe('patientPaymentApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('calls authenticated patient payment history endpoint with exact supported query params', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listMyPayments({
      status: 'FAILED',
      page: 1,
      size: 20,
      sort: 'amount,asc',
    })

    expect(mockGet).toHaveBeenCalledWith('/payments/me', {
      params: {
        status: 'FAILED',
        page: 1,
        size: 20,
        sort: 'amount,asc',
      },
    })

    const callParams = mockGet.mock.calls[0]?.[1]?.params as Record<string, unknown>
    expect(callParams.patientId).toBeUndefined()
    expect(callParams.patientEmail).toBeUndefined()
    expect(callParams.userId).toBeUndefined()
    expect(callParams.adminId).toBeUndefined()
    expect(callParams.role).toBeUndefined()
    expect(callParams.claimId).toBeUndefined()
  })

  it('omits empty params by sending no params object', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listMyPayments({})

    expect(mockGet).toHaveBeenCalledWith('/payments/me', {
      params: undefined,
    })
  })

  it('calls exact payment endpoint with exact backend payload fields only', async () => {
    mockPost.mockResolvedValue({ data: { paymentId: 42, status: 'SUCCESS' } })

    await createClaimPayment(11, {
      outcome: 'SUCCESS',
    })

    expect(mockPost).toHaveBeenCalledWith('/payments/claims/11', {
      outcome: 'SUCCESS',
    })

    const payload = mockPost.mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload.amount).toBeUndefined()
    expect(payload.patientId).toBeUndefined()
    expect(payload.patientEmail).toBeUndefined()
    expect(payload.cardNumber).toBeUndefined()
    expect(payload.cvv).toBeUndefined()
    expect(payload.bankAccount).toBeUndefined()
    expect(payload.routingNumber).toBeUndefined()
  })

  it('sends failureReason only when provided by caller', async () => {
    mockPost.mockResolvedValue({ data: { paymentId: 43, status: 'FAILED' } })

    await createClaimPayment(12, {
      outcome: 'FAILURE',
      failureReason: 'Simulated bank decline',
    })

    expect(mockPost).toHaveBeenCalledWith('/payments/claims/12', {
      outcome: 'FAILURE',
      failureReason: 'Simulated bank decline',
    })
  })
})
