import { apiClient } from './apiClient'
import type {
  MarkAllNotificationsReadResponse,
  PatientNotificationQuery,
  PatientNotificationResponse,
  PatientNotificationsPageResponse,
  UnreadNotificationCountResponse,
} from '../types/notification'

function sanitizeNotificationQuery(
  params?: PatientNotificationQuery,
): PatientNotificationQuery | undefined {
  if (!params) {
    return undefined
  }

  const query: PatientNotificationQuery = {}

  if (params.type) {
    query.type = params.type
  }

  if (typeof params.read === 'boolean') {
    query.read = params.read
  }

  if (typeof params.page === 'number') {
    query.page = params.page
  }

  if (typeof params.size === 'number') {
    query.size = params.size
  }

  if (params.sort) {
    query.sort = params.sort
  }

  return Object.keys(query).length > 0 ? query : undefined
}

export async function listMyNotifications(
  params?: PatientNotificationQuery,
): Promise<PatientNotificationsPageResponse> {
  const { data } = await apiClient.get<PatientNotificationsPageResponse>('/notifications/me', {
    params: sanitizeNotificationQuery(params),
  })

  return data
}

export async function getMyUnreadNotificationCount(): Promise<UnreadNotificationCountResponse> {
  const { data } = await apiClient.get<UnreadNotificationCountResponse>('/notifications/me/unread-count')
  return data
}

export async function markMyNotificationRead(
  notificationId: number,
): Promise<PatientNotificationResponse> {
  const { data } = await apiClient.patch<PatientNotificationResponse>(
    `/notifications/${notificationId}/read`,
  )

  return data
}

export async function markAllMyNotificationsRead(): Promise<MarkAllNotificationsReadResponse> {
  const { data } = await apiClient.patch<MarkAllNotificationsReadResponse>('/notifications/me/read-all')
  return data
}