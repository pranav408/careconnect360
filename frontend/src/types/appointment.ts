import type { PageResponse } from './pagination'

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'

export interface CreateAppointmentRequest {
  doctorId: number
  appointmentDate: string
  appointmentTime: string
  reason: string
}

export interface AppointmentResponse {
  appointmentId: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  doctorSpecialization: string
  appointmentDate: string
  appointmentTime: string
  reason: string
  status: AppointmentStatus
  createdAt: string
}

export interface PatientAppointmentsQuery {
  status?: AppointmentStatus
  page?: number
  size?: number
  sort?: string
}

export type PatientAppointmentsResponse = PageResponse<AppointmentResponse>

export interface DoctorAppointmentQuery {
  status?: AppointmentStatus
  page?: number
  size?: number
  sort?: string
}

export type DoctorAppointmentsResponse = PageResponse<AppointmentResponse>
