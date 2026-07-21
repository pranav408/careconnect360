import type { PageResponse } from './pagination'

export interface DoctorProfileResponse {
  doctorId: number
  fullName: string
  specialization: string
  licenseNumber: string
  phone: string
  clinicAddress: string | null
  consultationFee: number
  availableForAppointments: boolean
}

export interface DoctorDirectoryQuery {
  name?: string
  specialization?: string
  available?: boolean
  page?: number
  size?: number
  sort?: string
}

export type DoctorDirectoryResponse = PageResponse<DoctorProfileResponse>
