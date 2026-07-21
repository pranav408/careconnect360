import { apiClient } from './apiClient'
import type {
  AdminInsurancePoliciesResponse,
  AdminInsurancePolicyQuery,
  AdminInsurancePolicyResponse,
  RejectInsurancePolicyRequest,
} from '../types/insurance'

export async function listAdminInsurancePolicies(
  params?: AdminInsurancePolicyQuery,
): Promise<AdminInsurancePoliciesResponse> {
  const { data } = await apiClient.get<AdminInsurancePoliciesResponse>('/admin/insurance/policies', {
    params,
  })

  return data
}

export async function activateAdminInsurancePolicy(
  policyId: number,
): Promise<AdminInsurancePolicyResponse> {
  const { data } = await apiClient.patch<AdminInsurancePolicyResponse>(
    `/admin/insurance/policies/${policyId}/activate`,
  )

  return data
}

export async function rejectAdminInsurancePolicy(
  policyId: number,
  request: RejectInsurancePolicyRequest,
): Promise<AdminInsurancePolicyResponse> {
  const { data } = await apiClient.patch<AdminInsurancePolicyResponse>(
    `/admin/insurance/policies/${policyId}/reject`,
    request,
  )

  return data
}
