import type { PageResponse } from './pagination'

export type NotificationType =
  | 'APPOINTMENT_REQUESTED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_REJECTED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_COMPLETED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_VERIFIED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'CLAIM_PAID'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'APPOINTMENT'
  | 'INSURANCE_POLICY'
  | 'CLAIM'
  | 'PAYMENT'
  | 'SYSTEM'

export type NotificationEmailStatus = 'NOT_REQUESTED' | 'PENDING' | 'SENT' | 'FAILED'

export type NotificationReadFilter = boolean

export type NotificationSortField = 'createdAt' | 'type' | 'read' | 'readAt'

export type SortDirection = 'asc' | 'desc'

export interface PatientNotificationResponse {
  notificationId: number
  type: NotificationType
  title: string
  message: string
  read: boolean
  readAt: string | null
  emailStatus: NotificationEmailStatus
  createdAt: string | null
  updatedAt: string | null
}

export interface PatientNotificationQuery {
  type?: NotificationType
  read?: NotificationReadFilter
  page?: number
  size?: number
  sort?: `${NotificationSortField},${SortDirection}`
}

export type PatientNotificationsPageResponse = PageResponse<PatientNotificationResponse>

export interface UnreadNotificationCountResponse {
  unreadCount: number
}

export interface MarkAllNotificationsReadResponse {
  updatedCount: number
}