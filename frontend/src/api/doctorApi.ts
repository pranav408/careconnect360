import { apiClient } from './apiClient'
import type { DoctorDirectoryQuery, DoctorDirectoryResponse, DoctorProfileResponse } from '../types/doctor'

export async function getDoctors(params: DoctorDirectoryQuery): Promise<DoctorDirectoryResponse> {
  const { data } = await apiClient.get<DoctorDirectoryResponse>('/doctors', { params })
  return data
}

export async function getDoctorById(doctorId: number): Promise<DoctorProfileResponse> {
  const { data } = await apiClient.get<DoctorProfileResponse>(`/doctors/${doctorId}`)
  return data
}
