import { apiClient } from './apiClient'
import type {
  AdminClaimQuery,
  AdminClaimResponse,
  AdminClaimsPageResponse,
  RejectClaimRequest,
} from '../types/claim'

export async function listAdminClaims(params?: AdminClaimQuery): Promise<AdminClaimsPageResponse> {
  const { data } = await apiClient.get<AdminClaimsPageResponse>('/admin/claims', {
    params,
  })

  return data
}

export async function verifyAdminClaim(claimId: number): Promise<AdminClaimResponse> {
  const { data } = await apiClient.patch<AdminClaimResponse>(`/admin/claims/${claimId}/verify`)

  return data
}

export async function approveAdminClaim(claimId: number): Promise<AdminClaimResponse> {
  const { data } = await apiClient.patch<AdminClaimResponse>(`/admin/claims/${claimId}/approve`)

  return data
}

export async function rejectAdminClaim(
  claimId: number,
  request: RejectClaimRequest,
): Promise<AdminClaimResponse> {
  const { data } = await apiClient.patch<AdminClaimResponse>(`/admin/claims/${claimId}/reject`, request)

  return data
}
