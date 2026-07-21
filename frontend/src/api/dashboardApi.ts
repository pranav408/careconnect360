import { apiClient } from './apiClient'
import type { PatientDashboardResponse } from '../types/dashboard'

export async function getPatientDashboard(): Promise<PatientDashboardResponse> {
  const { data } = await apiClient.get<PatientDashboardResponse>('/dashboard/patient')
  return data
}
