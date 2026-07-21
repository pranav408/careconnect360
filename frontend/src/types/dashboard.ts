import type { PatientGender } from './auth'
import type { PolicyStatus } from './insurance'

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'

export type ClaimStatus = 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'PAID'

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED'

export interface DashboardPatientProfileSummary {
  patientId: number
  email: string
  fullName: string
  phone: string
  address: string
  dateOfBirth: string
  gender: PatientGender
  accountStatus: string
}

export interface DashboardPolicySummary {
  policyId: number
  policyNumber: string
  providerName: string
  coveragePercentage: number
  deductibleAmount: number
  startDate: string
  endDate: string
  status: PolicyStatus
}

export interface DashboardAppointmentSummary {
  appointmentId: number
  appointmentDate: string
  appointmentTime: string
  reason: string
  status: AppointmentStatus
  doctorId: number
  doctorName: string
  doctorSpecialization: string
  patientId: number
  patientName: string
  createdAt: string
}

export interface StatusCountResponse {
  status: string
  count: number
}

export interface DashboardClaimSummary {
  claimId: number
  appointmentId: number
  policyId: number
  policyNumber: string
  requestedAmount: number | null
  approvedAmount: number | null
  patientResponsibility: number | null
  status: ClaimStatus
  doctorName: string
  patientName: string
  createdAt: string
}

export interface DashboardPaymentSummary {
  paymentId: number
  claimId: number
  appointmentId: number
  transactionReference: string
  amount: number
  status: PaymentStatus
  failureReason: string | null
  paidAt: string | null
  patientName: string
  createdAt: string
}

export interface PatientDashboardResponse {
  profile: DashboardPatientProfileSummary
  activePolicy: DashboardPolicySummary | null
  upcomingAppointments: DashboardAppointmentSummary[]
  appointmentCounts: StatusCountResponse[]
  claimCounts: StatusCountResponse[]
  outstandingPatientResponsibility: number
  recentClaims: DashboardClaimSummary[]
  recentPayments: DashboardPaymentSummary[]
  unreadNotificationCount: number
}
