import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded'
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import WalletRoundedIcon from '@mui/icons-material/WalletRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  TablePagination,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import {
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from '../../api/patientNotificationApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { formatLocalDateTime } from '../../components/dashboard/dashboardFormatters'
import { useShellNotifications } from '../../components/layout/shellNotifications'
import type {
  NotificationSortField,
  NotificationType,
  PatientNotificationQuery,
  PatientNotificationResponse,
  PatientNotificationsPageResponse,
  SortDirection,
} from '../../types/notification'

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: `${NotificationSortField},${SortDirection}` = 'createdAt,desc'
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

type ReadFilter = 'ALL' | 'UNREAD' | 'READ'
type TypeFilter = 'ALL' | NotificationType

interface NotificationFilters {
  read: ReadFilter
  type: TypeFilter
}

interface SnackbarState {
  severity: 'success' | 'error'
  message: string
}

interface SortOption {
  value: `${NotificationSortField},${SortDirection}`
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'read,asc', label: 'Unread first' },
  { value: 'readAt,desc', label: 'Recently read first' },
  { value: 'type,asc', label: 'Type A-Z' },
]

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'ALL', label: 'All types' },
  { value: 'APPOINTMENT_REQUESTED', label: 'Appointment requested' },
  { value: 'APPOINTMENT_CONFIRMED', label: 'Appointment confirmed' },
  { value: 'APPOINTMENT_REJECTED', label: 'Appointment rejected' },
  { value: 'APPOINTMENT_CANCELLED', label: 'Appointment cancelled' },
  { value: 'APPOINTMENT_COMPLETED', label: 'Appointment completed' },
  { value: 'CLAIM_SUBMITTED', label: 'Claim submitted' },
  { value: 'CLAIM_VERIFIED', label: 'Claim verified' },
  { value: 'CLAIM_APPROVED', label: 'Claim approved' },
  { value: 'CLAIM_REJECTED', label: 'Claim rejected' },
  { value: 'CLAIM_PAID', label: 'Claim paid' },
  { value: 'PAYMENT_SUCCESS', label: 'Payment success' },
  { value: 'PAYMENT_FAILED', label: 'Payment failed' },
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'INSURANCE_POLICY', label: 'Insurance policy' },
  { value: 'CLAIM', label: 'Claim' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'SYSTEM', label: 'System' },
]

function createEmptyPage(): PatientNotificationsPageResponse {
  return {
    content: [],
    pageable: {
      pageNumber: 0,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: {
        empty: false,
        sorted: true,
        unsorted: false,
      },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: 0,
    totalPages: 0,
    last: true,
    size: DEFAULT_PAGE_SIZE,
    number: 0,
    sort: {
      empty: false,
      sorted: true,
      unsorted: false,
    },
    first: true,
    numberOfElements: 0,
    empty: true,
  }
}

function buildQuery(
  filters: NotificationFilters,
  page: number,
  size: number,
  sort: `${NotificationSortField},${SortDirection}`,
): PatientNotificationQuery {
  const query: PatientNotificationQuery = {
    page,
    size,
    sort,
  }

  if (filters.read === 'READ') {
    query.read = true
  }

  if (filters.read === 'UNREAD') {
    query.read = false
  }

  if (filters.type !== 'ALL') {
    query.type = filters.type
  }

  return query
}

function toListErrorTitle(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted'
  }

  if (status === 400) {
    return 'Invalid notification query'
  }

  if (status && status >= 500) {
    return 'Notification service unavailable'
  }

  return 'Unable to load notifications'
}

function toListErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Your account is not allowed to access patient notifications.'
  }

  return getApiErrorMessage(error)
}

function toMarkReadErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'You are not allowed to modify this notification.'
  }

  if (status === 404) {
    return 'This notification could not be found. The list will be refreshed.'
  }

  if (status === 409) {
    return 'This notification was already updated. The list will be refreshed.'
  }

  if (status && status >= 500) {
    return 'The notification service is temporarily unavailable. Please try again.'
  }

  return getApiErrorMessage(error)
}

function toMarkAllErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'You are not allowed to modify these notifications.'
  }

  if (status === 409) {
    return 'Notification state changed before the request completed. The list will be refreshed.'
  }

  if (status && status >= 500) {
    return 'Unable to mark all notifications as read right now. Please try again.'
  }

  return getApiErrorMessage(error)
}

function getNotificationTypeLabel(type: string): string {
  const knownType = TYPE_OPTIONS.find((option) => option.value === type)
  if (knownType) {
    return knownType.label
  }

  return 'Notification'
}

function getNotificationIcon(type: string) {
  if (type.startsWith('APPOINTMENT')) {
    return <EventAvailableRoundedIcon aria-hidden="true" />
  }

  if (type === 'INSURANCE_POLICY') {
    return <HealthAndSafetyRoundedIcon aria-hidden="true" />
  }

  if (type.startsWith('CLAIM') || type === 'CLAIM') {
    return <ReceiptLongRoundedIcon aria-hidden="true" />
  }

  if (type.startsWith('PAYMENT') || type === 'PAYMENT') {
    return <WalletRoundedIcon aria-hidden="true" />
  }

  return <InfoOutlinedIcon aria-hidden="true" />
}

function getRelatedRoute(type: string): { href: string; label: string } | null {
  if (type.startsWith('APPOINTMENT') || type === 'APPOINTMENT') {
    return { href: '/patient/appointments', label: 'Open appointments' }
  }

  if (type === 'INSURANCE_POLICY') {
    return { href: '/patient/insurance', label: 'Open insurance' }
  }

  if (type.startsWith('CLAIM') || type === 'CLAIM') {
    return { href: '/patient/claims', label: 'Open claims' }
  }

  if (type.startsWith('PAYMENT') || type === 'PAYMENT') {
    return { href: '/patient/payments', label: 'Open payments' }
  }

  return null
}

function countVisibleUnread(content: PatientNotificationResponse[]): number {
  return content.filter((notification) => !notification.read).length
}

function LoadingSkeleton() {
  return (
    <Stack spacing={2} aria-label="Loading notifications">
      <Skeleton variant="text" width="40%" height={48} />
      <Skeleton variant="text" width="58%" height={28} />
      <Grid container spacing={1.2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Skeleton variant="rounded" height={96} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Skeleton variant="rounded" height={96} />
        </Grid>
      </Grid>
      <Skeleton variant="rounded" height={144} />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={188} />
      ))}
    </Stack>
  )
}

function SummaryCard({
  label,
  value,
  helperText,
}: {
  label: string
  value: string
  helperText: string
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Card>
        <CardContent sx={{ py: 1.8 }}>
          <Stack spacing={0.6}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontSize: '1.2rem' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )
}

export function PatientNotificationsPage() {
  const [draftFilters, setDraftFilters] = useState<NotificationFilters>({
    read: 'ALL',
    type: 'ALL',
  })
  const [appliedFilters, setAppliedFilters] = useState<NotificationFilters>({
    read: 'ALL',
    type: 'ALL',
  })
  const [selectedSort, setSelectedSort] = useState<`${NotificationSortField},${SortDirection}`>(
    DEFAULT_SORT,
  )
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [notificationPage, setNotificationPage] = useState<PatientNotificationsPageResponse | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [listErrorTitle, setListErrorTitle] = useState('Unable to load notifications')
  const [selectedNotification, setSelectedNotification] = useState<PatientNotificationResponse | null>(null)
  const [pendingReadIds, setPendingReadIds] = useState<number[]>([])
  const [isMarkAllDialogOpen, setIsMarkAllDialogOpen] = useState(false)
  const [isMarkAllSubmitting, setIsMarkAllSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const hasLoadedOnceRef = useRef(false)

  const { unreadNotificationCount, refreshUnreadNotificationCount } = useShellNotifications()

  const loadNotifications = useCallback(async () => {
    const query = buildQuery(appliedFilters, page, pageSize, selectedSort)

    setListError(null)

    if (hasLoadedOnceRef.current) {
      setIsReloading(true)
    }

    try {
      const response = await listMyNotifications(query)
      setNotificationPage(response)
    } catch (error) {
      setListErrorTitle(toListErrorTitle(error))
      setListError(toListErrorMessage(error))
    } finally {
      hasLoadedOnceRef.current = true
      setIsInitialLoading(false)
      setIsReloading(false)
    }
  }, [appliedFilters, page, pageSize, selectedSort])

  useEffect(() => {
    queueMicrotask(() => {
      void loadNotifications()
    })
  }, [loadNotifications])

  const safePage = notificationPage ?? createEmptyPage()
  const visibleUnreadCount = useMemo(
    () => countVisibleUnread(safePage.content),
    [safePage.content],
  )
  const reliableUnreadCount = typeof unreadNotificationCount === 'number' ? unreadNotificationCount : null
  const hasActiveFilters = appliedFilters.read !== 'ALL' || appliedFilters.type !== 'ALL'
  const showEmpty = !isInitialLoading && !listError && safePage.content.length === 0

  const appliedSummary = useMemo(() => {
    const parts: string[] = []

    if (appliedFilters.read === 'UNREAD') {
      parts.push('Unread only')
    } else if (appliedFilters.read === 'READ') {
      parts.push('Read only')
    } else {
      parts.push('All read states')
    }

    if (appliedFilters.type !== 'ALL') {
      parts.push(`Type: ${getNotificationTypeLabel(appliedFilters.type)}`)
    } else {
      parts.push('All types')
    }

    return parts.join(' • ')
  }, [appliedFilters.read, appliedFilters.type])

  const emptyTitle = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (appliedFilters.read === 'UNREAD' && appliedFilters.type === 'ALL') {
      return 'You\'re all caught up'
    }

    if (appliedFilters.read === 'READ' && appliedFilters.type === 'ALL') {
      return 'No read notifications yet'
    }

    if (hasActiveFilters) {
      return 'No notifications match these filters'
    }

    return 'No notifications yet'
  }, [appliedFilters.read, appliedFilters.type, hasActiveFilters, showEmpty])

  const emptyDescription = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (appliedFilters.read === 'UNREAD' && appliedFilters.type === 'ALL') {
      return 'You\'re all caught up.'
    }

    if (appliedFilters.read === 'READ' && appliedFilters.type === 'ALL') {
      return 'Notifications that you have already opened and marked as read will appear here.'
    }

    if (hasActiveFilters) {
      return 'No notifications match the selected filters. Clear filters to view the full history.'
    }

    return 'You do not have any notifications yet. Updates about appointments, insurance, claims, and payments will appear here.'
  }, [appliedFilters.read, appliedFilters.type, hasActiveFilters, showEmpty])

  const applyLocalReadUpdate = useCallback((updatedNotification: PatientNotificationResponse) => {
    setNotificationPage((currentPage) => {
      if (!currentPage) {
        return currentPage
      }

      return {
        ...currentPage,
        content: currentPage.content.map((notification) =>
          notification.notificationId === updatedNotification.notificationId
            ? updatedNotification
            : notification,
        ),
      }
    })

    setSelectedNotification((currentSelected) => {
      if (!currentSelected) {
        return currentSelected
      }

      return currentSelected.notificationId === updatedNotification.notificationId
        ? updatedNotification
        : currentSelected
    })
  }, [])

  const handleMarkAsRead = useCallback(
    async (notification: PatientNotificationResponse) => {
      if (notification.read || pendingReadIds.includes(notification.notificationId)) {
        return
      }

      setPendingReadIds((current) => [...current, notification.notificationId])

      try {
        const updatedNotification = await markMyNotificationRead(notification.notificationId)

        if (appliedFilters.read === 'UNREAD') {
          await loadNotifications()
        } else {
          applyLocalReadUpdate(updatedNotification)
        }

        await refreshUnreadNotificationCount()
        setSnackbar({
          severity: 'success',
          message: `Notification ${updatedNotification.notificationId} marked as read.`,
        })
      } catch (error) {
        setSnackbar({
          severity: 'error',
          message: toMarkReadErrorMessage(error),
        })

        if (getApiErrorStatus(error) === 404 || getApiErrorStatus(error) === 409) {
          await Promise.all([loadNotifications(), refreshUnreadNotificationCount()])
        }
      } finally {
        setPendingReadIds((current) => current.filter((id) => id !== notification.notificationId))
      }
    },
    [appliedFilters.read, applyLocalReadUpdate, loadNotifications, pendingReadIds, refreshUnreadNotificationCount],
  )

  const handleConfirmMarkAllRead = useCallback(async () => {
    if (isMarkAllSubmitting || reliableUnreadCount === 0) {
      return
    }

    setIsMarkAllSubmitting(true)

    try {
      const response = await markAllMyNotificationsRead()
      setIsMarkAllDialogOpen(false)
      await Promise.all([loadNotifications(), refreshUnreadNotificationCount()])
      setSnackbar({
        severity: 'success',
        message:
          response.updatedCount === 1
            ? '1 notification marked as read.'
            : `${response.updatedCount} notifications marked as read.`,
      })
    } catch (error) {
      setSnackbar({
        severity: 'error',
        message: toMarkAllErrorMessage(error),
      })

      if (getApiErrorStatus(error) === 409) {
        await Promise.all([loadNotifications(), refreshUnreadNotificationCount()])
      }
    } finally {
      setIsMarkAllSubmitting(false)
    }
  }, [isMarkAllSubmitting, loadNotifications, refreshUnreadNotificationCount, reliableUnreadCount])

  if (isInitialLoading && !notificationPage) {
    return <LoadingSkeleton />
  }

  if (listError && !notificationPage) {
    return <PageError title={listErrorTitle} message={listError} onRetry={() => void loadNotifications()} />
  }

  return (
    <Stack spacing={2.2} aria-busy={isReloading}>
      <Stack spacing={0.6}>
        <Typography variant="h2">Notifications</Typography>
        <Typography color="text.secondary">
          Review updates created by your appointments, insurance activity, claims, and payments.
        </Typography>
        <Chip label="Patient" color="secondary" sx={{ width: 'fit-content' }} />
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h3">Patient notification history</Typography>
            <Typography color="text.secondary">
              Notifications are derived from your authenticated patient session. No patient identifier is sent from the browser.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {reliableUnreadCount === null ? (
                <Skeleton variant="rounded" width={164} height={40} />
              ) : (
                <Chip
                  color={reliableUnreadCount > 0 ? 'primary' : 'default'}
                  icon={<NotificationsActiveRoundedIcon aria-hidden="true" />}
                  label={`${reliableUnreadCount} unread`}
                  aria-label={`${reliableUnreadCount} unread notifications`}
                  sx={{ width: 'fit-content' }}
                />
              )}

              {reliableUnreadCount !== null && reliableUnreadCount > 0 ? (
                <Button
                  variant="outlined"
                  startIcon={<MarkEmailReadRoundedIcon />}
                  onClick={() => setIsMarkAllDialogOpen(true)}
                  disabled={isMarkAllSubmitting}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Mark all as read
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.2}>
        <SummaryCard
          label="Unread notifications"
          value={reliableUnreadCount === null ? '—' : String(reliableUnreadCount)}
          helperText="Global unread count"
        />
        <SummaryCard
          label="Visible notifications"
          value={String(safePage.numberOfElements)}
          helperText="Current page"
        />
        <SummaryCard
          label="Visible unread"
          value={String(visibleUnreadCount)}
          helperText="Current page"
        />
      </Grid>

      <Card>
        <CardContent>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="notification-read-filter-label">Read status</InputLabel>
                <Select
                  labelId="notification-read-filter-label"
                  label="Read status"
                  value={draftFilters.read}
                  onChange={(event) => {
                    setDraftFilters((current) => ({
                      ...current,
                      read: event.target.value as ReadFilter,
                    }))
                  }}
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="UNREAD">Unread</MenuItem>
                  <MenuItem value="READ">Read</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="notification-type-filter-label">Type</InputLabel>
                <Select
                  labelId="notification-type-filter-label"
                  label="Type"
                  value={draftFilters.type}
                  onChange={(event) => {
                    setDraftFilters((current) => ({
                      ...current,
                      type: event.target.value as TypeFilter,
                    }))
                  }}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="notification-sort-label">Sort</InputLabel>
                <Select
                  labelId="notification-sort-label"
                  label="Sort"
                  value={selectedSort}
                  onChange={(event) => {
                    setSelectedSort(event.target.value as `${NotificationSortField},${SortDirection}`)
                    setPage(0)
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="notification-page-size-label">Page Size</InputLabel>
                <Select
                  labelId="notification-page-size-label"
                  label="Page Size"
                  value={String(pageSize)}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPage(0)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={String(option)}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<SearchRoundedIcon />}
                  onClick={() => {
                    setAppliedFilters(draftFilters)
                    setPage(0)
                  }}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Search
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<FilterAltOffRoundedIcon />}
                  onClick={() => {
                    const nextFilters: NotificationFilters = {
                      read: 'ALL',
                      type: 'ALL',
                    }

                    setDraftFilters(nextFilters)
                    setAppliedFilters(nextFilters)
                    setSelectedSort(DEFAULT_SORT)
                    setPage(0)
                    setPageSize(DEFAULT_PAGE_SIZE)
                  }}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Clear Filters
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography color="text.secondary" variant="body2">
        {appliedSummary}
      </Typography>

      {isReloading ? <LinearProgress aria-label="Refreshing notifications" /> : null}

      {listError && notificationPage ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadNotifications()}>
              Retry
            </Button>
          }
        >
          {listError}
        </Alert>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={<NotificationsActiveRoundedIcon />}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={
            hasActiveFilters
              ? () => {
                  const nextFilters: NotificationFilters = {
                    read: 'ALL',
                    type: 'ALL',
                  }

                  setDraftFilters(nextFilters)
                  setAppliedFilters(nextFilters)
                  setSelectedSort(DEFAULT_SORT)
                  setPage(0)
                  setPageSize(DEFAULT_PAGE_SIZE)
                }
              : undefined
          }
        />
      ) : null}

      {safePage.content.length > 0 ? (
        <Card>
          <CardContent sx={{ pb: 1.5 }}>
            <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {safePage.content.map((notification) => {
                const relatedRoute = getRelatedRoute(notification.type)
                const isMarkingRead = pendingReadIds.includes(notification.notificationId)

                return (
                  <Card
                    key={notification.notificationId}
                    component="li"
                    variant="outlined"
                    sx={{
                      borderColor: notification.read ? 'divider' : 'primary.main',
                      backgroundColor: notification.read ? 'background.paper' : 'rgba(15, 118, 110, 0.05)',
                      boxShadow: 'none',
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1.25}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          sx={{ justifyContent: 'space-between' }}
                        >
                          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'flex-start' }}>
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                bgcolor: notification.read ? 'rgba(21, 101, 192, 0.08)' : 'rgba(15, 118, 110, 0.14)',
                                color: notification.read ? 'secondary.main' : 'primary.main',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {getNotificationIcon(notification.type)}
                            </Box>

                            <Stack spacing={0.4} sx={{ minWidth: 0 }}>
                              <Typography variant="h4" sx={{ wordBreak: 'break-word' }}>
                                {notification.title}
                              </Typography>
                              <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                <Chip
                                  size="small"
                                  label={getNotificationTypeLabel(notification.type)}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  color={notification.read ? 'default' : 'primary'}
                                  label={notification.read ? 'Read' : 'Unread'}
                                  aria-label={`Notification status ${notification.read ? 'Read' : 'Unread'}`}
                                />
                              </Stack>
                            </Stack>
                          </Stack>

                          <Stack spacing={0.35} sx={{ minWidth: { sm: 190 } }}>
                            <Typography variant="body2" color="text.secondary">
                              Created: {formatLocalDateTime(notification.createdAt)}
                            </Typography>
                            {notification.readAt ? (
                              <Typography variant="body2" color="text.secondary">
                                Read: {formatLocalDateTime(notification.readAt)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Read: Not yet read
                              </Typography>
                            )}
                          </Stack>
                        </Stack>

                        <Typography color="text.secondary" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {notification.message}
                        </Typography>

                        {isMarkingRead ? <LinearProgress aria-label={`Marking notification ${notification.notificationId} as read`} /> : null}
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityRoundedIcon />}
                        onClick={() => setSelectedNotification(notification)}
                      >
                        View details
                      </Button>

                      {!notification.read ? (
                        <Button
                          variant="contained"
                          startIcon={<MarkEmailReadRoundedIcon />}
                          onClick={() => void handleMarkAsRead(notification)}
                          disabled={isMarkingRead}
                          aria-label={`Mark notification ${notification.notificationId} as read`}
                        >
                          {isMarkingRead ? 'Marking...' : 'Mark as read'}
                        </Button>
                      ) : null}

                      {relatedRoute ? (
                        <Button
                          component={RouterLink}
                          to={relatedRoute.href}
                          variant="text"
                          startIcon={<OpenInNewRoundedIcon />}
                        >
                          {relatedRoute.label}
                        </Button>
                      ) : null}
                    </CardActions>
                  </Card>
                )
              })}
            </Stack>
          </CardContent>

          <TablePagination
            component="div"
            count={safePage.totalElements}
            page={safePage.number}
            rowsPerPage={pageSize}
            onPageChange={(_, nextPage) => {
              setPage(nextPage)
            }}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            labelRowsPerPage="Notifications per page"
          />
        </Card>
      ) : null}

      <Dialog
        open={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{selectedNotification?.title ?? 'Notification details'}</DialogTitle>
        <DialogContent>
          {selectedNotification ? (
            <Stack spacing={1.2}>
              <DialogContentText>
                Type: {getNotificationTypeLabel(selectedNotification.type)}
              </DialogContentText>
              <DialogContentText>
                Status: {selectedNotification.read ? 'Read' : 'Unread'}
              </DialogContentText>
              <DialogContentText>
                Created: {formatLocalDateTime(selectedNotification.createdAt)}
              </DialogContentText>
              <DialogContentText>
                Read: {selectedNotification.readAt ? formatLocalDateTime(selectedNotification.readAt) : 'Not yet read'}
              </DialogContentText>
              <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedNotification.message}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          {selectedNotification && getRelatedRoute(selectedNotification.type) ? (
            <Button
              component={RouterLink}
              to={getRelatedRoute(selectedNotification.type)?.href ?? '/patient'}
              startIcon={<OpenInNewRoundedIcon />}
            >
              {getRelatedRoute(selectedNotification.type)?.label}
            </Button>
          ) : null}

          {selectedNotification && !selectedNotification.read ? (
            <Button
              variant="contained"
              startIcon={<MarkEmailReadRoundedIcon />}
              onClick={() => void handleMarkAsRead(selectedNotification)}
              disabled={pendingReadIds.includes(selectedNotification.notificationId)}
            >
              {pendingReadIds.includes(selectedNotification.notificationId) ? 'Marking...' : 'Mark as read'}
            </Button>
          ) : null}

          <Button onClick={() => setSelectedNotification(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isMarkAllDialogOpen}
        onClose={() => {
          if (!isMarkAllSubmitting) {
            setIsMarkAllDialogOpen(false)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Mark all notifications as read?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {reliableUnreadCount === null
              ? 'This action will mark your unread notifications as read.'
              : `This will mark ${reliableUnreadCount} unread notification${reliableUnreadCount === 1 ? '' : 's'} as read.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setIsMarkAllDialogOpen(false)} disabled={isMarkAllSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleConfirmMarkAllRead()}
            disabled={isMarkAllSubmitting || reliableUnreadCount === 0}
          >
            {isMarkAllSubmitting ? 'Marking...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {snackbar ? (
        <Snackbar
          open
          autoHideDuration={4000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      ) : null}
    </Stack>
  )
}