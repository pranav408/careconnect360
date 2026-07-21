import { apiClient } from './apiClient'
import type {
  AdminDoctorQuery,
  AdminDoctorResponse,
  AdminDoctorsPageResponse,
  CreateDoctorRequest,
  CreateDoctorResponse,
} from '../types/adminDoctor'

export async function listAdminDoctors(params?: AdminDoctorQuery): Promise<AdminDoctorsPageResponse> {
  const { data } = await apiClient.get<AdminDoctorsPageResponse>('/doctors', {
    params,
  })

  return data
}

export async function getAdminDoctorDetail(doctorId: number): Promise<AdminDoctorResponse> {
  const { data } = await apiClient.get<AdminDoctorResponse>(`/doctors/${doctorId}`)
  return data
}

export async function createAdminDoctor(request: CreateDoctorRequest): Promise<CreateDoctorResponse> {
  const { data } = await apiClient.post<CreateDoctorResponse>('/admin/doctors', request)
  return data
}
