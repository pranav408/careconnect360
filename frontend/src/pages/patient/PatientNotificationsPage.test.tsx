import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellNotificationProvider } from '../../components/layout/ShellNotificationContext'
import { PatientNotificationsPage } from './PatientNotificationsPage'
import type {
  NotificationType,
  PatientNotificationResponse,
  PatientNotificationsPageResponse,
} from '../../types/notification'

const mockListMyNotifications = vi.fn()
const mockMarkMyNotificationRead = vi.fn()
const mockMarkAllMyNotificationsRead = vi.fn()

vi.mock('../../api/patientNotificationApi', () => ({
  listMyNotifications: (...args: unknown[]) => mockListMyNotifications(...args),
  markMyNotificationRead: (...args: unknown[]) => mockMarkMyNotificationRead(...args),
  markAllMyNotificationsRead: (...args: unknown[]) => mockMarkAllMyNotificationsRead(...args),
  getMyUnreadNotificationCount: vi.fn(),
}))

function makePage(
  content: PatientNotificationResponse[],
  overrides: Partial<PatientNotificationsPageResponse> = {},
): PatientNotificationsPageResponse {
  return {
    content,
    pageable: {
      pageNumber: 0,
      pageSize: 10,
      sort: { empty: false, sorted: true, unsorted: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: content.length,
    totalPages: 1,
    last: true,
    size: 10,
    number: 0,
    sort: { empty: false, sorted: true, unsorted: false },
    first: true,
    numberOfElements: content.length,
    empty: content.length === 0,
    ...overrides,
  }
}

function notificationFixture(
  overrides: Partial<PatientNotificationResponse> = {},
): PatientNotificationResponse {
  return {
    notificationId: 1,
    type: 'PAYMENT_SUCCESS',
    title: 'Payment successful',
    message: 'Your payment was processed successfully.',
    read: false,
    readAt: null,
    emailStatus: 'NOT_REQUESTED',
    createdAt: '2026-07-14T11:20:00',
    updatedAt: '2026-07-14T11:20:00',
    ...overrides,
  }
}

function renderPage(options?: { unreadCount?: number; refreshSequence?: number[] }) {
  const unreadCount = options?.unreadCount ?? 3
  const refreshSequence = [...(options?.refreshSequence ?? [unreadCount])]
  const refreshUnreadNotificationCount = vi.fn(async () => {
    const nextCount = refreshSequence.length > 0 ? refreshSequence.shift() ?? unreadCount : unreadCount
    return nextCount
  })

  function Wrapper() {
    const [count, setCount] = useState<number | null>(unreadCount)

    const refreshAndPersistCount = async () => {
      const nextCount = await refreshUnreadNotificationCount()
      setCount(nextCount)
      return nextCount
    }

    return (
      <MemoryRouter>
        <ShellNotificationProvider
          value={{
            unreadNotificationCount: count,
            setUnreadNotificationCount: setCount,
            refreshUnreadNotificationCount: refreshAndPersistCount,
          }}
        >
          <PatientNotificationsPage />
        </ShellNotificationProvider>
      </MemoryRouter>
    )
  }

  return {
    ...render(<Wrapper />),
    refreshUnreadNotificationCount,
  }
}

describe('PatientNotificationsPage', () => {
  beforeEach(() => {
    mockListMyNotifications.mockReset()
    mockMarkMyNotificationRead.mockReset()
    mockMarkAllMyNotificationsRead.mockReset()

    mockListMyNotifications.mockResolvedValue(makePage([]))
  })

  it('renders backend notifications with unread and read labels', async () => {
    mockListMyNotifications.mockResolvedValue(
      makePage([
        notificationFixture({ notificationId: 1, title: 'Unread notice', read: false }),
        notificationFixture({ notificationId: 2, title: 'Read notice', read: true, readAt: '2026-07-14T12:00:00' }),
      ]),
    )

    renderPage({ unreadCount: 1 })

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText('Unread notice')).toBeInTheDocument()
    expect(screen.getByText('Read notice')).toBeInTheDocument()
    expect(screen.getAllByText('Unread').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Read').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Created: 2026-07-14 11:20:00').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Mark notification 1 as read' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark notification 2 as read' })).not.toBeInTheDocument()
  })

  it('uses fallback label for unknown types and renders notification text as plain text', async () => {
    mockListMyNotifications.mockResolvedValue(
      makePage([
        notificationFixture({
          notificationId: 7,
          type: 'FUTURE_EVENT' as unknown as NotificationType,
          message: '<img src=x onerror="window.__xss__=true" />',
        }),
      ]),
    )

    renderPage()

    expect(await screen.findByText('Notification')).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror="window.__xss__=true" />')).toBeInTheDocument()
  })

  it('sends exact read, type, page, size, and sort params and resets page when filters change', async () => {
    const user = userEvent.setup()

    mockListMyNotifications
      .mockResolvedValueOnce(
        makePage([notificationFixture()], {
          totalElements: 25,
          totalPages: 3,
          last: false,
        }),
      )
      .mockResolvedValueOnce(
        makePage([notificationFixture({ notificationId: 2 })], {
          number: 1,
          totalElements: 25,
          totalPages: 3,
          first: false,
          last: false,
        }),
      )
      .mockResolvedValue(makePage([]))

    renderPage()

    await screen.findByRole('heading', { name: 'Notifications' })
    await user.click(screen.getByRole('button', { name: /go to next page/i }))

    await waitFor(() => {
      expect(
        mockListMyNotifications.mock.calls.some((call) => call[0]?.page === 1 && call[0]?.size === 10),
      ).toBe(true)
    })

    await user.click(screen.getByLabelText('Read status'))
    await user.click(screen.getByRole('option', { name: 'Unread' }))

    await user.click(screen.getByLabelText('Type'))
    await user.click(screen.getByRole('option', { name: 'Payment success' }))

    await user.click(screen.getByLabelText('Page Size'))
    await user.click(screen.getByRole('option', { name: '20' }))

    await user.click(screen.getByLabelText('Sort'))
    await user.click(screen.getByRole('option', { name: 'Type A-Z' }))

    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListMyNotifications).toHaveBeenLastCalledWith({
        read: false,
        type: 'PAYMENT_SUCCESS',
        page: 0,
        size: 20,
        sort: 'type,asc',
      })
    })
  })

  it('marks one notification as read and updates the visible state', async () => {
    const user = userEvent.setup()

    mockListMyNotifications.mockResolvedValue(makePage([notificationFixture({ notificationId: 11, title: 'Needs review' })]))
    mockMarkMyNotificationRead.mockResolvedValue(
      notificationFixture({
        notificationId: 11,
        title: 'Needs review',
        read: true,
        readAt: '2026-07-14T13:05:00',
      }),
    )

    const { refreshUnreadNotificationCount } = renderPage({ unreadCount: 2, refreshSequence: [1] })

    await user.click(await screen.findByRole('button', { name: 'Mark notification 11 as read' }))

    await waitFor(() => {
      expect(mockMarkMyNotificationRead).toHaveBeenCalledWith(11)
    })

    expect(refreshUnreadNotificationCount).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Read: 2026-07-14 13:05:00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark notification 11 as read' })).not.toBeInTheDocument()
  })

  it('prevents duplicate mark-as-read submissions while a request is pending', async () => {
    const user = userEvent.setup()

    mockListMyNotifications.mockResolvedValue(makePage([notificationFixture({ notificationId: 22 })]))
    mockMarkMyNotificationRead.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    const markButton = await screen.findByRole('button', { name: 'Mark notification 22 as read' })
    await user.click(markButton)
    fireEvent.click(markButton)

    expect(mockMarkMyNotificationRead).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Mark notification 22 as read' })).toBeDisabled()
    expect(
      screen.getByRole('progressbar', { name: 'Marking notification 22 as read' }),
    ).toBeInTheDocument()
  })

  it('confirms mark-all, calls the exact endpoint once, and refreshes the list', async () => {
    const user = userEvent.setup()

    mockListMyNotifications
      .mockResolvedValueOnce(
        makePage([
          notificationFixture({ notificationId: 31, title: 'Claim update' }),
          notificationFixture({ notificationId: 32, title: 'Payment update' }),
        ]),
      )
      .mockResolvedValueOnce(
        makePage([
          notificationFixture({ notificationId: 31, title: 'Claim update', read: true, readAt: '2026-07-14T14:00:00' }),
          notificationFixture({ notificationId: 32, title: 'Payment update', read: true, readAt: '2026-07-14T14:00:00' }),
        ]),
      )

    mockMarkAllMyNotificationsRead.mockResolvedValue({ updatedCount: 2 })

    const { refreshUnreadNotificationCount } = renderPage({ unreadCount: 2, refreshSequence: [0] })

    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }))

    const dialog = await screen.findByRole('dialog', { name: 'Mark all notifications as read?' })
    expect(within(dialog).getByText('This will mark 2 unread notifications as read.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(mockMarkAllMyNotificationsRead).toHaveBeenCalledTimes(1)
    })

    expect(refreshUnreadNotificationCount).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument()
    expect((await screen.findAllByText('Read: 2026-07-14 14:00:00')).length).toBeGreaterThan(0)
  })

  it('renders filtered empty state with clear filters action', async () => {
    const user = userEvent.setup()

    mockListMyNotifications
      .mockResolvedValueOnce(makePage([notificationFixture()]))
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValueOnce(makePage([notificationFixture({ notificationId: 99, title: 'Back again' })]))

    renderPage()

    await screen.findByRole('heading', { name: 'Notifications' })

    await user.click(screen.getByLabelText('Read status'))
    await user.click(screen.getByRole('option', { name: 'Unread' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    const emptyStateTitle = await screen.findByText('You\'re all caught up')
    expect(emptyStateTitle).toBeInTheDocument()

    const emptyState = emptyStateTitle.closest('div')
    expect(emptyState).not.toBeNull()

    await user.click(within(emptyState as HTMLElement).getByRole('button', { name: 'Clear Filters' }))

    await waitFor(() => {
      expect(screen.getByText('Back again')).toBeInTheDocument()
    })
  })

  it('renders safe related navigation links based on notification type', async () => {
    mockListMyNotifications.mockResolvedValue(
      makePage([
        notificationFixture({ notificationId: 41, type: 'APPOINTMENT_CONFIRMED', title: 'Appointment ready' }),
        notificationFixture({ notificationId: 42, type: 'INSURANCE_POLICY', title: 'Insurance review' }),
        notificationFixture({ notificationId: 43, type: 'CLAIM_APPROVED', title: 'Claim approved' }),
        notificationFixture({ notificationId: 44, type: 'PAYMENT_FAILED', title: 'Payment failed' }),
        notificationFixture({ notificationId: 45, type: 'SYSTEM', title: 'System note' }),
      ]),
    )

    renderPage()

    await screen.findByText('Appointment ready')

    expect(screen.getByRole('link', { name: 'Open appointments' })).toHaveAttribute('href', '/patient/appointments')
    expect(screen.getByRole('link', { name: 'Open insurance' })).toHaveAttribute('href', '/patient/insurance')
    expect(screen.getByRole('link', { name: 'Open claims' })).toHaveAttribute('href', '/patient/claims')
    expect(screen.getByRole('link', { name: 'Open payments' })).toHaveAttribute('href', '/patient/payments')
    expect(screen.queryByRole('link', { name: 'Open system' })).not.toBeInTheDocument()
  })
})