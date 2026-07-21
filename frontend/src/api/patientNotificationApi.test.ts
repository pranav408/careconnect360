import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from './patientNotificationApi'

const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

describe('patientNotificationApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('calls exact authenticated patient notifications endpoint with supported query params only', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listMyNotifications({
      type: 'PAYMENT_SUCCESS',
      read: false,
      page: 1,
      size: 20,
      sort: 'type,asc',
    })

    expect(mockGet).toHaveBeenCalledWith('/notifications/me', {
      params: {
        type: 'PAYMENT_SUCCESS',
        read: false,
        page: 1,
        size: 20,
        sort: 'type,asc',
      },
    })

    const callParams = mockGet.mock.calls[0]?.[1]?.params as Record<string, unknown>
    expect(callParams.patientId).toBeUndefined()
    expect(callParams.patientEmail).toBeUndefined()
    expect(callParams.userId).toBeUndefined()
    expect(callParams.role).toBeUndefined()
    expect(callParams.adminId).toBeUndefined()
    expect(callParams.notificationId).toBeUndefined()
    expect(callParams.unread).toBeUndefined()
  })

  it('omits unsupported or empty list params', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listMyNotifications({})

    expect(mockGet).toHaveBeenCalledWith('/notifications/me', {
      params: undefined,
    })
  })

  it('calls exact unread count endpoint', async () => {
    mockGet.mockResolvedValue({ data: { unreadCount: 3 } })

    await getMyUnreadNotificationCount()

    expect(mockGet).toHaveBeenCalledWith('/notifications/me/unread-count')
  })

  it('calls exact mark-one-read endpoint with no invented body', async () => {
    mockPatch.mockResolvedValue({ data: { notificationId: 11, read: true } })

    await markMyNotificationRead(11)

    expect(mockPatch).toHaveBeenCalledWith('/notifications/11/read')
    expect(mockPatch.mock.calls[0]?.length).toBe(1)
  })

  it('calls exact mark-all endpoint with no invented body', async () => {
    mockPatch.mockResolvedValue({ data: { updatedCount: 4 } })

    await markAllMyNotificationsRead()

    expect(mockPatch).toHaveBeenCalledWith('/notifications/me/read-all')
    expect(mockPatch.mock.calls[0]?.length).toBe(1)
  })
})