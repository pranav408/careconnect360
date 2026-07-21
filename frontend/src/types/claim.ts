import type { PageResponse } from './pagination'

export type ClaimStatus = 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'PAID'

export type SortDirection = 'asc' | 'desc'

export type AdminClaimSortField =
  | 'createdAt'
  | 'status'
  | 'requestedAmount'
  | 'approvedAmount'
  | 'patientResponsibility'
  | 'claimId'

export interface AdminClaimResponse {
  claimId: number
  appointmentId: number | null
  policyId: number | null
  policyNumber: string | null
  patientId: number | null
  patientName: string | null
  doctorId: number | null
  doctorName: string | null
  requestedAmount: number | null
  approvedAmount: number | null
  patientResponsibility: number | null
  rejectionReason: string | null
  status: ClaimStatus
  createdAt: string | null
  updatedAt: string | null
}

export type AdminClaimsPageResponse = PageResponse<AdminClaimResponse>

export interface AdminClaimQuery {
  status?: ClaimStatus
  patientEmail?: string
  policyNumber?: string
  appointmentId?: number
  page?: number
  size?: number
  sort?: `${AdminClaimSortField},${SortDirection}`
}

export interface RejectClaimRequest {
  reason: string
}

export type PatientClaimSortField = AdminClaimSortField

export interface PatientClaimResponse {
  claimId: number
  appointmentId: number | null
  policyId: number | null
  policyNumber: string | null
  patientId: number | null
  patientName: string | null
  doctorId: number | null
  doctorName: string | null
  requestedAmount: number | null
  approvedAmount: number | null
  patientResponsibility: number | null
  rejectionReason: string | null
  status: ClaimStatus
  createdAt: string | null
  updatedAt: string | null
}

export type PatientClaimsPageResponse = PageResponse<PatientClaimResponse>

export interface PatientClaimQuery {
  status?: ClaimStatus
  page?: number
  size?: number
  sort?: `${PatientClaimSortField},${SortDirection}`
}
