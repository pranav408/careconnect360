import { apiClient } from './apiClient'
import type {
  AppointmentResponse,
  DoctorAppointmentQuery,
  DoctorAppointmentsResponse,
} from '../types/appointment'

export async function getDoctorAppointments(
  params: DoctorAppointmentQuery,
): Promise<DoctorAppointmentsResponse> {
  const { data } = await apiClient.get<DoctorAppointmentsResponse>('/doctor/appointments', { params })
  return data
}

export async function confirmDoctorAppointment(appointmentId: number): Promise<AppointmentResponse> {
  const { data } = await apiClient.patch<AppointmentResponse>(
    `/doctor/appointments/${appointmentId}/confirm`,
  )
  return data
}

export async function rejectDoctorAppointment(appointmentId: number): Promise<AppointmentResponse> {
  const { data } = await apiClient.patch<AppointmentResponse>(
    `/doctor/appointments/${appointmentId}/reject`,
  )
  return data
}

export async function completeDoctorAppointment(appointmentId: number): Promise<AppointmentResponse> {
  const { data } = await apiClient.patch<AppointmentResponse>(
    `/doctor/appointments/${appointmentId}/complete`,
  )
  return data
}
