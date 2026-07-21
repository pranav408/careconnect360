import { apiClient } from './apiClient'
import type {
  PatientClaimQuery,
  PatientClaimResponse,
  PatientClaimsPageResponse,
} from '../types/claim'

export async function listMyClaims(params?: PatientClaimQuery): Promise<PatientClaimsPageResponse> {
  const { data } = await apiClient.get<PatientClaimsPageResponse>('/claims/me', {
    params,
  })

  return data
}

export async function getMyClaimById(claimId: number): Promise<PatientClaimResponse> {
  const { data } = await apiClient.get<PatientClaimResponse>(`/claims/${claimId}`)

  return data
}
