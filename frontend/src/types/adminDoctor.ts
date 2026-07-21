export type SortDirection = 'asc' | 'desc'

export type AdminDoctorSortField =
  | 'fullName'
  | 'specialization'
  | 'consultationFee'
  | 'licenseNumber'
  | 'availableForAppointments'

export interface AdminDoctorResponse {
  doctorId: number
  fullName: string
  specialization: string
  licenseNumber: string
  phone: string
  clinicAddress: string | null
  consultationFee: number
  availableForAppointments: boolean
}

export interface AdminDoctorsPageResponse {
  content: AdminDoctorResponse[]
  pageable: {
    pageNumber: number
    pageSize: number
    sort: {
      empty: boolean
      sorted: boolean
      unsorted: boolean
    }
    offset: number
    paged: boolean
    unpaged: boolean
  }
  totalElements: number
  totalPages: number
  last: boolean
  size: number
  number: number
  sort: {
    empty: boolean
    sorted: boolean
    unsorted: boolean
  }
  first: boolean
  numberOfElements: number
  empty: boolean
}

export interface AdminDoctorQuery {
  name?: string
  specialization?: string
  available?: boolean
  page?: number
  size?: number
  sort?: `${AdminDoctorSortField},${SortDirection}`
}

export interface CreateDoctorRequest {
  email: string
  password: string
  fullName: string
  specialization: string
  licenseNumber: string
  phone: string
  clinicAddress?: string
  consultationFee: number
}

export type DoctorRole = 'DOCTOR'
export type DoctorAccountStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface CreateDoctorResponse {
  userId: number
  doctorId: number
  email: string
  fullName: string
  specialization: string
  licenseNumber: string
  phone: string
  clinicAddress: string | null
  consultationFee: number
  availableForAppointments: boolean
  role: DoctorRole
  status: DoctorAccountStatus
  message: string
}
