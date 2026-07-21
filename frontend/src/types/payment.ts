import type { PageResponse } from './pagination'

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED'

export type PaymentMethod = never

export type SortDirection = 'asc' | 'desc'

export type PatientPaymentSortField =
  | 'createdAt'
  | 'amount'
  | 'status'
  | 'paidAt'
  | 'transactionReference'
  | 'paymentId'

export interface PatientPaymentResponse {
  paymentId: number
  claimId: number | null
  appointmentId: number | null
  transactionReference: string | null
  amount: number | null
  status: PaymentStatus
  paidAt: string | null
  failureReason: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PatientPaymentHistoryQuery {
  status?: PaymentStatus
  page?: number
  size?: number
  sort?: `${PatientPaymentSortField},${SortDirection}`
}

export type PatientPaymentsPageResponse = PageResponse<PatientPaymentResponse>

export type MockPaymentOutcome = 'SUCCESS' | 'FAILURE'

export interface CreatePaymentRequest {
  outcome: MockPaymentOutcome
  failureReason?: string
}

export type PaymentResultResponse = PatientPaymentResponse
