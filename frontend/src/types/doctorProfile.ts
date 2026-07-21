export type DoctorAccountStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface DoctorProfileResponse {
  doctorId: number
  email: string
  fullName: string
  specialization: string
  phone: string
  consultationFee: number
  available: boolean
  accountStatus: DoctorAccountStatus
}

export interface UpdateDoctorProfileRequest {
  fullName: string
  specialization: string
  phone: string
  consultationFee: number
  available: boolean
}