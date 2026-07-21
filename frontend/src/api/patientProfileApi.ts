import { apiClient } from './apiClient'
import type {
  PatientProfileResponse,
  UpdatePatientProfileRequest,
} from '../types/patient'

export async function getMyPatientProfile(): Promise<PatientProfileResponse> {
  const { data } = await apiClient.get<PatientProfileResponse>('/patients/me')
  return data
}

export async function updateMyPatientProfile(
  request: UpdatePatientProfileRequest,
): Promise<PatientProfileResponse> {
  const { data } = await apiClient.put<PatientProfileResponse>('/patients/me', request)
  return data
}