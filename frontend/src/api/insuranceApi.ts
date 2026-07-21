import { apiClient } from './apiClient'
import type {
  CreateInsurancePolicyRequest,
  InsurancePolicyResponse,
  PatientInsurancePoliciesApiResponse,
  PatientInsurancePoliciesQuery,
  PatientInsurancePoliciesResponse,
} from '../types/insurance'

function extractPolicyList(data: PatientInsurancePoliciesApiResponse): PatientInsurancePoliciesResponse {
  if (Array.isArray(data)) {
    return data
  }

  const candidate = data as Partial<{ content: InsurancePolicyResponse[] }>
  if (Array.isArray(candidate.content)) {
    return candidate.content
  }

  return []
}

export async function submitInsurancePolicy(
  request: CreateInsurancePolicyRequest,
): Promise<InsurancePolicyResponse> {
  const { data } = await apiClient.post<InsurancePolicyResponse>('/insurance/policies', request)
  return data
}

export async function getMyInsurancePolicies(
  params?: PatientInsurancePoliciesQuery,
): Promise<PatientInsurancePoliciesResponse> {
  const { data } = await apiClient.get<PatientInsurancePoliciesApiResponse>('/insurance/policies/me', {
    params,
  })
  return extractPolicyList(data)
}

export async function getMyActiveInsurancePolicy(): Promise<InsurancePolicyResponse> {
  const { data } = await apiClient.get<InsurancePolicyResponse>('/insurance/policies/me/active')
  return data
}
