import { apiClient } from './apiClient'
import type { DoctorProfileResponse, UpdateDoctorProfileRequest } from '../types/doctorProfile'

export async function getMyDoctorProfile(): Promise<DoctorProfileResponse> {
  const { data } = await apiClient.get<DoctorProfileResponse>('/doctors/me')
  return data
}

export async function updateMyDoctorProfile(
  request: UpdateDoctorProfileRequest,
): Promise<DoctorProfileResponse> {
  const { data } = await apiClient.put<DoctorProfileResponse>('/doctors/me', request)
  return data
}