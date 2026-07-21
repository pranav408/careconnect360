import { apiClient } from './apiClient'
import type {
  CreatePaymentRequest,
  PatientPaymentHistoryQuery,
  PatientPaymentsPageResponse,
  PaymentResultResponse,
} from '../types/payment'

function sanitizePaymentHistoryQuery(
  params?: PatientPaymentHistoryQuery,
): PatientPaymentHistoryQuery | undefined {
  if (!params) {
    return undefined
  }

  const query: PatientPaymentHistoryQuery = {}

  if (params.status) {
    query.status = params.status
  }

  if (typeof params.page === 'number') {
    query.page = params.page
  }

  if (typeof params.size === 'number') {
    query.size = params.size
  }

  if (params.sort) {
    query.sort = params.sort
  }

  return Object.keys(query).length > 0 ? query : undefined
}

export async function listMyPayments(
  params?: PatientPaymentHistoryQuery,
): Promise<PatientPaymentsPageResponse> {
  const { data } = await apiClient.get<PatientPaymentsPageResponse>('/payments/me', {
    params: sanitizePaymentHistoryQuery(params),
  })

  return data
}

export async function createClaimPayment(
  claimId: number,
  request: CreatePaymentRequest,
): Promise<PaymentResultResponse> {
  const { data } = await apiClient.post<PaymentResultResponse>(`/payments/claims/${claimId}`, request)

  return data
}
