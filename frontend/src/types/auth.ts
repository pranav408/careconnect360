export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN'

export type PatientGender =
  | 'MALE'
  | 'FEMALE'
  | 'OTHER'
  | 'PREFER_NOT_TO_SAY'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  userId: number
  email: string
  role: UserRole
  status: string
  message: string
}

export interface RegisterPatientRequest {
  email: string
  password: string
  fullName: string
  phone: string
  address?: string
  dateOfBirth?: string
  gender?: PatientGender
}

export interface RegisterPatientResponse {
  userId: number
  patientId: number
  email: string
  fullName: string
  role: UserRole
  status: string
  message: string
}

export interface CurrentUserResponse {
  userId: number
  email: string
  role: UserRole
  status: string
}

export interface AuthUser extends CurrentUserResponse {
  displayName: string
}
