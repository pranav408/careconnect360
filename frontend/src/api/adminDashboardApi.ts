import { apiClient } from './apiClient'
import type { AdminDashboardResponse } from '../types/adminDashboard'

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  const { data } = await apiClient.get<AdminDashboardResponse>('/dashboard/admin')

  return data
}