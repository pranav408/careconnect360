import type { AppointmentStatus } from './appointment'
import type { ClaimStatus } from './claim'
import type { PolicyStatus } from './insurance'
import type { PaymentStatus } from './payment'

export interface StatusCountResponse {
  status: string
  count: number
}

export interface AdminDashboardAppointmentSummary {
  appointmentId: number | null
  appointmentDate: string | null
  appointmentTime: string | null
  reason: string | null
  status: AppointmentStatus
  doctorId: number | null
  doctorName: string | null
  doctorSpecialization: string | null
  patientId: number | null
  patientName: string | null
  createdAt: string | null
}

export interface AdminDashboardClaimSummary {
  claimId: number | null
  appointmentId: number | null
  policyId: number | null
  policyNumber: string | null
  requestedAmount: number | null
  approvedAmount: number | null
  patientResponsibility: number | null
  status: ClaimStatus
  doctorName: string | null
  patientName: string | null
  createdAt: string | null
}

export interface AdminDashboardPaymentSummary {
  paymentId: number | null
  claimId: number | null
  appointmentId: number | null
  transactionReference: string | null
  amount: number | null
  status: PaymentStatus
  failureReason: string | null
  paidAt: string | null
  patientName: string | null
  createdAt: string | null
}

export interface AdminDashboardResponse {
  totalPatientCount: number
  totalDoctorCount: number
  availableDoctorCount: number
  totalAppointmentCount: number
  appointmentCounts: StatusCountResponse[]
  policyCounts: StatusCountResponse[]
  claimCounts: StatusCountResponse[]
  successfulPaymentCount: number
  failedPaymentCount: number
  totalSuccessfulPaymentAmount: number | null
  unreadNotificationCount: number
  recentAppointments: AdminDashboardAppointmentSummary[]
  recentClaims: AdminDashboardClaimSummary[]
  recentSuccessfulPayments: AdminDashboardPaymentSummary[]
  averageSettlementTime: string
}

export type AdminDashboardPolicyStatus = PolicyStatus