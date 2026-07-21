import type { PatientGender as AuthPatientGender } from './auth'

export type PatientGender = AuthPatientGender

export interface PatientProfileResponse {
  patientId: number
  email: string | null
  fullName: string
  phone: string
  address: string | null
  dateOfBirth: string | null
  gender: PatientGender | null
  accountStatus: string | null
}

export interface UpdatePatientProfileRequest {
  fullName: string
  phone: string
  address?: string
  dateOfBirth?: string
  gender?: PatientGender
}