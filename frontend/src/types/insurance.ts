import type { PageResponse } from './pagination'

export type PolicyStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED'

export interface CreateInsurancePolicyRequest {
  policyNumber: string
  providerName: string
  coveragePercentage: number
  deductibleAmount: number
  startDate: string
  endDate: string
}

export interface InsurancePolicyResponse {
  policyId: number
  policyNumber: string
  providerName: string
  coveragePercentage: number
  deductibleAmount: number
  startDate: string
  endDate: string
  status: PolicyStatus
  createdAt?: string
}

export type PatientInsurancePoliciesResponse = InsurancePolicyResponse[]

export type PatientInsurancePoliciesPageResponse = PageResponse<InsurancePolicyResponse>

export interface PatientInsurancePoliciesQuery {
  page?: number
  size?: number
  sort?: string
  status?: PolicyStatus
}

export type PatientInsurancePoliciesApiResponse =
  | PatientInsurancePoliciesResponse
  | PatientInsurancePoliciesPageResponse

export type SortDirection = 'asc' | 'desc'

export type AdminInsurancePolicySortField =
  | 'createdAt'
  | 'policyNumber'
  | 'providerName'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'coveragePercentage'
  | 'deductibleAmount'

export interface AdminInsurancePolicyResponse extends InsurancePolicyResponse {
  patientId?: number
  patientName?: string
  patientEmail?: string
}

export type AdminInsurancePoliciesResponse = PageResponse<AdminInsurancePolicyResponse>

export interface AdminInsurancePolicyQuery {
  status?: PolicyStatus
  patientEmail?: string
  policyNumber?: string
  page?: number
  size?: number
  sort?: `${AdminInsurancePolicySortField},${SortDirection}`
}

export interface RejectInsurancePolicyRequest {
  reason: string
}
