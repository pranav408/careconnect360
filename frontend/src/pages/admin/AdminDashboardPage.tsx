import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import { Alert, Button, Card, CardContent, Chip, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getAdminDashboard } from '../../api/adminDashboardApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { PageError } from '../../components/common/PageError'
import { MetricCard } from '../../components/dashboard/MetricCard'
import { StatusChip } from '../../components/dashboard/StatusChip'
import { formatLocalDate, formatLocalDateTime } from '../../components/dashboard/dashboardFormatters'
import type {
  AdminDashboardAppointmentSummary,
  AdminDashboardClaimSummary,
  AdminDashboardPaymentSummary,
  AdminDashboardResponse,
  StatusCountResponse,
} from '../../types/adminDashboard'
import type { AppointmentStatus } from '../../types/appointment'
import type { ClaimStatus } from '../../types/claim'
import type { PolicyStatus } from '../../types/insurance'

const APPOINTMENT_STATUSES: AppointmentStatus[] = ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED']
const POLICY_STATUSES: PolicyStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED']
const CLAIM_STATUSES: ClaimStatus[] = ['SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED', 'PAID']

interface DashboardPageError {
  title: string
  message: string
}

interface StatusCountsMap {
  [key: string]: number
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toDashboardPageError(error: unknown): DashboardPageError {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return {
      title: 'Access restricted',
      message: 'Your account is not allowed to view the admin dashboard.',
    }
  }

  if (status && status >= 500) {
    return {
      title: 'Server unavailable',
      message: 'The admin dashboard service is temporarily unavailable. Please try again shortly.',
    }
  }

  return {
    title: 'Unable to load dashboard',
    message: getApiErrorMessage(error),
  }
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '$0.00'
  }

  return usdFormatter.format(value)
}

function formatCount(value: number | null | undefined): string {
  return String(value ?? 0)
}

function createStatusCountMap<T extends string>(statuses: readonly T[], counts: StatusCountResponse[]): StatusCountsMap {
  const map: StatusCountsMap = {}

  for (const status of statuses) {
    map[status] = 0
  }

  for (const item of counts) {
    if (Object.prototype.hasOwnProperty.call(map, item.status)) {
      map[item.status] = item.count ?? 0
    }
  }

  return map
}

function LoadingState() {
  return (
    <Stack spacing={2.4} aria-busy="true" aria-live="polite" aria-label="Loading admin dashboard">
      <Card>
        <CardContent>
          <Skeleton variant="text" width="38%" height={42} />
          <Skeleton variant="text" width="70%" />
          <Stack direction="row" spacing={1} sx={{ mt: 1.2, flexWrap: 'wrap' }}>
            <Skeleton variant="rounded" width={120} height={32} />
            <Skeleton variant="rounded" width={136} height={32} />
            <Skeleton variant="rounded" width={126} height={32} />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="54%" />
                <Skeleton variant="rounded" height={38} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="70%" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="48%" />
                <Skeleton variant="rounded" height={160} sx={{ mt: 1.2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

function SummaryCard({
  title,
  statuses,
  counts,
}: {
  title: string
  statuses: readonly string[]
  counts: StatusCountsMap
}) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.4}>
          <Typography variant="h4" component="h2">
            {title}
          </Typography>

          {statuses.map((status) => (
            <Stack
              key={status}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <StatusChip status={status} />
              <Typography sx={{ fontWeight: 700 }} aria-label={`${status} count ${counts[status] ?? 0}`}>
                {formatCount(counts[status])}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function RecentAppointmentCard({ appointment }: { appointment: AdminDashboardAppointmentSummary }) {
  const details = [
    appointment.doctorName ? `Doctor: ${appointment.doctorName}` : null,
    appointment.doctorSpecialization ? `Specialty: ${appointment.doctorSpecialization}` : null,
    appointment.patientName ? `Patient: ${appointment.patientName}` : null,
    appointment.appointmentDate ? `Date: ${formatLocalDate(appointment.appointmentDate)}` : null,
    appointment.appointmentTime ? `Time: ${appointment.appointmentTime}` : null,
    appointment.createdAt ? `Created: ${formatLocalDateTime(appointment.createdAt)}` : null,
  ].filter(Boolean) as string[]

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h5" component="h3">
              {appointment.reason ?? 'Appointment'}
            </Typography>
            <StatusChip status={appointment.status} />
          </Stack>

          <Typography color="text.secondary">
            #{formatCount(appointment.appointmentId)} {appointment.doctorName ? `- ${appointment.doctorName}` : ''}
          </Typography>

          <Stack spacing={0.6}>
            {details.map((detail) => (
              <Typography key={detail} variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {detail}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function RecentClaimCard({ claim }: { claim: AdminDashboardClaimSummary }) {
  const details = [
    claim.patientName ? `Patient: ${claim.patientName}` : null,
    claim.doctorName ? `Doctor: ${claim.doctorName}` : null,
    claim.policyNumber ? `Policy: ${claim.policyNumber}` : null,
    `Requested: ${formatMoney(claim.requestedAmount)}`,
    `Approved: ${formatMoney(claim.approvedAmount)}`,
    `Patient responsibility: ${formatMoney(claim.patientResponsibility)}`,
    claim.createdAt ? `Created: ${formatLocalDateTime(claim.createdAt)}` : null,
  ].filter(Boolean) as string[]

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h5" component="h3">
              Claim #{formatCount(claim.claimId)}
            </Typography>
            <StatusChip status={claim.status} />
          </Stack>

          <Stack spacing={0.6}>
            {details.map((detail) => (
              <Typography key={detail} variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {detail}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function RecentPaymentCard({ payment }: { payment: AdminDashboardPaymentSummary }) {
  const details = [
    payment.patientName ? `Patient: ${payment.patientName}` : null,
    payment.transactionReference ? `Reference: ${payment.transactionReference}` : null,
    `Amount: ${formatMoney(payment.amount)}`,
    payment.paidAt ? `Paid: ${formatLocalDateTime(payment.paidAt)}` : null,
    payment.createdAt ? `Created: ${formatLocalDateTime(payment.createdAt)}` : null,
    payment.failureReason ? `Failure reason: ${payment.failureReason}` : null,
  ].filter(Boolean) as string[]

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h5" component="h3">
              Payment #{formatCount(payment.paymentId)}
            </Typography>
            <StatusChip status={payment.status} />
          </Stack>

          <Stack spacing={0.6}>
            {details.map((detail) => (
              <Typography key={detail} variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {detail}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<DashboardPageError | null>(null)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getAdminDashboard()
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

  const appointmentCounts = useMemo(
    () => createStatusCountMap(APPOINTMENT_STATUSES, dashboard?.appointmentCounts ?? []),
    [dashboard],
  )
  const policyCounts = useMemo(
    () => createStatusCountMap(POLICY_STATUSES, dashboard?.policyCounts ?? []),
    [dashboard],
  )
  const claimCounts = useMemo(() => createStatusCountMap(CLAIM_STATUSES, dashboard?.claimCounts ?? []), [dashboard])

  if (isLoading && !dashboard) {
    return <LoadingState />
  }

  if (error && !dashboard) {
    return <PageError title={error.title} message={error.message} onRetry={() => void loadDashboard()} />
  }

  if (!dashboard) {
    return (
      <PageError
        title="Dashboard unavailable"
        message="No admin dashboard data was returned. Please retry."
        onRetry={() => void loadDashboard()}
      />
    )
  }

  return (
    <Stack spacing={2.4}>
      <Card>
        <CardContent>
          <Stack spacing={1.4}>
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h3" component="h1">
                Admin Dashboard
              </Typography>
              <Chip label="Administrator" color="info" aria-label="Administrator role" />
            </Stack>

            <Typography color="text.secondary" sx={{ maxWidth: 880 }}>
              Monitor patients, doctors, appointments, insurance policies, claims, and settlement activity from one
              place.
            </Typography>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button component={RouterLink} to="/admin/insurance" variant="contained" startIcon={<HealthAndSafetyRoundedIcon />}>
                Manage Insurance
              </Button>
              <Button component={RouterLink} to="/admin/claims" variant="outlined" startIcon={<ReceiptLongRoundedIcon />}>
                Manage Claims
              </Button>
              <Button component={RouterLink} to="/admin/doctors" variant="outlined" startIcon={<MedicalServicesRoundedIcon />}>
                Manage Doctors
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadDashboard()}>
              Retry
            </Button>
          }
        >
          {error.message}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Total Patients"
            value={formatCount(dashboard.totalPatientCount)}
            helperText="Registered patient accounts"
            icon={<PeopleRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #0F766E 0%, #2A9D96 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Total Doctors"
            value={formatCount(dashboard.totalDoctorCount)}
            helperText="Doctor accounts in the platform"
            icon={<LocalHospitalRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #1565C0 0%, #3A86D6 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Available Doctors"
            value={formatCount(dashboard.availableDoctorCount)}
            helperText="Doctors currently accepting appointments"
            icon={<DashboardRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #2E7D32 0%, #43A047 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Total Appointments"
            value={formatCount(dashboard.totalAppointmentCount)}
            helperText="Appointments across every status"
            icon={<EventAvailableRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #5E35B1 0%, #3949AB 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Successful Payments"
            value={formatCount(dashboard.successfulPaymentCount)}
            helperText="Completed settlement transactions"
            icon={<PaymentsRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #EF6C00 0%, #F9A825 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Failed Payments"
            value={formatCount(dashboard.failedPaymentCount)}
            helperText="Payment attempts that failed"
            icon={<CreditCardRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #B71C1C 0%, #E53935 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Successful Payment Total"
            value={formatMoney(dashboard.totalSuccessfulPaymentAmount)}
            helperText="USD settled successfully"
            icon={<ReceiptLongRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #00695C 0%, #00897B 100%)"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <MetricCard
            label="Unread Notifications"
            value={formatCount(dashboard.unreadNotificationCount)}
            helperText="Notifications still unread"
            icon={<NotificationsRoundedIcon aria-hidden="true" />}
            gradient="linear-gradient(145deg, #455A64 0%, #607D8B 100%)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard title="Appointment Status Summary" statuses={APPOINTMENT_STATUSES} counts={appointmentCounts} />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard title="Insurance Policy Status Summary" statuses={POLICY_STATUSES} counts={policyCounts} />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard title="Claim Status Summary" statuses={CLAIM_STATUSES} counts={claimCounts} />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Typography variant="h4" component="h2">
                Dashboard context
              </Typography>
              <Typography color="text.secondary">Average settlement time: {dashboard.averageSettlementTime}</Typography>
            </Stack>
            <Typography color="text.secondary">
              The dashboard is driven by backend aggregation only. Counts and totals reflect the authenticated admin
              session without extra client-side calculations.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {dashboard.recentAppointments.length > 0 ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={1.4}>
                  <Stack spacing={0.3}>
                    <Typography variant="h4" component="h2">
                      Recent Appointments
                    </Typography>
                    <Typography color="text.secondary">Latest five appointment records returned by the backend.</Typography>
                  </Stack>

                  <Divider />

                  <Stack spacing={1.2}>
                    {dashboard.recentAppointments.map((appointment) => (
                      <RecentAppointmentCard key={String(appointment.appointmentId ?? appointment.createdAt ?? appointment.reason)} appointment={appointment} />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {dashboard.recentClaims.length > 0 ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={1.4}>
                  <Stack spacing={0.3}>
                    <Typography variant="h4" component="h2">
                      Recent Claims
                    </Typography>
                    <Typography color="text.secondary">Latest five claim records returned by the backend.</Typography>
                  </Stack>

                  <Divider />

                  <Stack spacing={1.2}>
                    {dashboard.recentClaims.map((claim) => (
                      <RecentClaimCard key={String(claim.claimId ?? claim.createdAt ?? claim.policyNumber)} claim={claim} />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {dashboard.recentSuccessfulPayments.length > 0 ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={1.4}>
                  <Stack spacing={0.3}>
                    <Typography variant="h4" component="h2">
                      Recent Successful Payments
                    </Typography>
                    <Typography color="text.secondary">Latest successful settlement records returned by the backend.</Typography>
                  </Stack>

                  <Divider />

                  <Stack spacing={1.2}>
                    {dashboard.recentSuccessfulPayments.map((payment) => (
                      <RecentPaymentCard key={String(payment.paymentId ?? payment.createdAt ?? payment.transactionReference)} payment={payment} />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </Stack>
  )
}