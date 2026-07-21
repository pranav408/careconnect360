import { apiClient } from './apiClient'
import type {
  AppointmentResponse,
  CreateAppointmentRequest,
  PatientAppointmentsQuery,
  PatientAppointmentsResponse,
} from '../types/appointment'

export async function createAppointment(
  request: CreateAppointmentRequest,
): Promise<AppointmentResponse> {
  const { data } = await apiClient.post<AppointmentResponse>('/appointments', request)
  return data
}

export async function getMyAppointments(
  params: PatientAppointmentsQuery,
): Promise<PatientAppointmentsResponse> {
  const { data } = await apiClient.get<PatientAppointmentsResponse>('/appointments/me', { params })
  return data
}

export async function cancelAppointment(appointmentId: number): Promise<AppointmentResponse> {
  const { data } = await apiClient.patch<AppointmentResponse>(`/appointments/${appointmentId}/cancel`)
  return data
}
