import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import { Grid, Stack } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { getPatientDashboard } from '../../api/dashboardApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton'
import { MetricCard } from '../../components/dashboard/MetricCard'
import { PatientDashboardHeader } from '../../components/dashboard/PatientDashboardHeader'
import { ActivePolicyCard } from '../../components/dashboard/ActivePolicyCard'
import { UpcomingAppointmentsCard } from '../../components/dashboard/UpcomingAppointmentsCard'
import { StatusCountsSection } from '../../components/dashboard/StatusCountsSection'
import { RecentClaimsSection } from '../../components/dashboard/RecentClaimsSection'
import { RecentPaymentsSection } from '../../components/dashboard/RecentPaymentsSection'
import { formatUsd } from '../../components/dashboard/dashboardFormatters'
import { PageError } from '../../components/common/PageError'
import type { PatientDashboardResponse } from '../../types/dashboard'

interface DashboardPageError {
  title: string
  message: string
}

function toDashboardPageError(error: unknown): DashboardPageError {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return {
      title: 'Access restricted',
      message: 'Your account does not have permission to open the patient dashboard.',
    }
  }

  if (status === 404) {
    return {
      title: 'Profile not found',
      message:
        'Your patient profile could not be found for this session. Please contact support if this continues.',
    }
  }

  if (status && status >= 500) {
    return {
      title: 'Server unavailable',
      message: 'The dashboard service is temporarily unavailable. Please try again shortly.',
    }
  }

  return {
    title: 'Unable to load dashboard',
    message: getApiErrorMessage(error),
  }
}

function totalFromStatusCounts(response: PatientDashboardResponse): number {
  return response.claimCounts.reduce((sum, item) => sum + item.count, 0)
}

export function PatientDashboardPage() {
  const [dashboard, setDashboard] = useState<PatientDashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<DashboardPageError | null>(null)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getPatientDashboard()
      setDashboard(data)
    } catch (loadError) {
      setError(toDashboardPageError(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboard()
    })
  }, [loadDashboard])

  if (isLoading && !dashboard) {
    return <DashboardSkeleton />
  }

  if (error && !dashboard) {
    return <PageError title={error.title} message={error.message} onRetry={() => void loadDashboard()} />
  }

  if (!dashboard) {
    return (
      <PageError
        title="Dashboard unavailable"
        message="No dashboard data was returned. Please retry."
        onRetry={() => void loadDashboard()}
      />
    )
  }

  return (
    <Stack spacing={2.2}>
      <PatientDashboardHeader fullName={dashboard.profile.fullName} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Upcoming Appointments"
            value={String(dashboard.upcomingAppointments.length)}
            helperText="Scheduled appointments ahead"
            icon={<EventAvailableRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #0F766E 0%, #2A9D96 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Total Claims"
            value={String(totalFromStatusCounts(dashboard))}
            helperText="Claims across all statuses"
            icon={<ReceiptLongRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #1565C0 0%, #3A86D6 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Outstanding Responsibility"
            value={formatUsd(dashboard.outstandingPatientResponsibility)}
            helperText="Current patient amount due"
            icon={<MonetizationOnRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #2E7D32 0%, #43A047 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Unread Notifications"
            value={String(dashboard.unreadNotificationCount)}
            helperText="Updates waiting for review"
            icon={<NotificationsActiveRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #5E35B1 0%, #3949AB 100%)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ActivePolicyCard policy={dashboard.activePolicy} />
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <UpcomingAppointmentsCard appointments={dashboard.upcomingAppointments} />
        </Grid>
      </Grid>

      <StatusCountsSection
        appointmentCounts={dashboard.appointmentCounts}
        claimCounts={dashboard.claimCounts}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <RecentClaimsSection claims={dashboard.recentClaims} />
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <RecentPaymentsSection payments={dashboard.recentPayments} />
        </Grid>
      </Grid>

      {error ? <PageError title={error.title} message={error.message} onRetry={() => void loadDashboard()} /> : null}
    </Stack>
  )
}
