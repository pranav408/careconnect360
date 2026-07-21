import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cancelAppointment, getMyAppointments } from '../../api/appointmentApi'
import { getApiErrorMessage } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { StatusChip } from '../../components/dashboard/StatusChip'
import { formatLocalDate, formatLocalDateTime, formatStatusLabel } from '../../components/dashboard/dashboardFormatters'
import { AppointmentListSkeleton } from '../../components/patient/AppointmentListSkeleton'
import type { AppointmentResponse, AppointmentStatus, PatientAppointmentsResponse } from '../../types/appointment'

const PAGE_SIZE = 8

interface PageLocationState {
  flashMessage?: string
}

interface AppointmentSection {
  title: string
  items: AppointmentResponse[]
}

function isCancellableStatus(status: AppointmentStatus): boolean {
  return status === 'REQUESTED' || status === 'CONFIRMED'
}

function toSectionKey(appointment: AppointmentResponse): 'upcoming' | 'past' | 'closed' {
  if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') {
    return 'closed'
  }

  if (appointment.status === 'COMPLETED') {
    return 'past'
  }

  const [year, month, day] = appointment.appointmentDate.split('-').map((part) => Number(part))
  const [hour, minute] = appointment.appointmentTime.split(':').map((part) => Number(part))
  const appointmentDateTime = new Date(year, month - 1, day, hour, minute)

  return appointmentDateTime.getTime() >= Date.now() ? 'upcoming' : 'past'
}

function buildSections(appointments: AppointmentResponse[]): AppointmentSection[] {
  const buckets = {
    upcoming: [] as AppointmentResponse[],
    past: [] as AppointmentResponse[],
    closed: [] as AppointmentResponse[],
  }

  for (const appointment of appointments) {
    buckets[toSectionKey(appointment)].push(appointment)
  }

  return [
    { title: 'Upcoming', items: buckets.upcoming },
    { title: 'Past / Completed', items: buckets.past },
    { title: 'Cancelled / Rejected', items: buckets.closed },
  ].filter((section) => section.items.length > 0)
}

export function PatientAppointmentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as PageLocationState | null

  const [appointmentsPage, setAppointmentsPage] = useState<PatientAppointmentsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [flashMessage, setFlashMessage] = useState<string | null>(locationState?.flashMessage ?? null)
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (locationState?.flashMessage) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, locationState?.flashMessage, navigate])

  const loadAppointments = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getMyAppointments({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: page - 1,
        size: PAGE_SIZE,
        sort: 'appointmentDate,desc',
      })
      setAppointmentsPage(response)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    queueMicrotask(() => {
      void loadAppointments()
    })
  }, [loadAppointments])

  const sections = useMemo(() => buildSections(appointmentsPage?.content ?? []), [appointmentsPage?.content])

  const handleCancelConfirmed = async () => {
    if (!selectedAppointment) {
      return
    }

    setIsCancelling(true)
    setErrorMessage(null)

    try {
      const updated = await cancelAppointment(selectedAppointment.appointmentId)
      setAppointmentsPage((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          content: current.content.map((appointment) =>
            appointment.appointmentId === updated.appointmentId ? updated : appointment,
          ),
        }
      })
      setSelectedAppointment(null)
      setFlashMessage('Appointment cancelled successfully with status CANCELLED.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsCancelling(false)
    }
  }

  if (errorMessage && !appointmentsPage) {
    return (
      <PageError
        title="Unable to load appointments"
        message={errorMessage}
        onRetry={() => {
          void loadAppointments()
        }}
      />
    )
  }

  return (
    <Stack spacing={2.2}>
      <Stack spacing={0.6}>
        <Typography variant="h2">Appointments</Typography>
        <Typography color="text.secondary">
          Review your appointments, track status updates, and cancel when allowed.
        </Typography>
      </Stack>

      {flashMessage ? (
        <Alert severity="success" onClose={() => setFlashMessage(null)}>
          {flashMessage}
        </Alert>
      ) : null}

      {errorMessage && appointmentsPage ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadAppointments()}>
              Retry
            </Button>
          }
        >
          {errorMessage}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 8, md: 5 }}>
              <FormControl fullWidth>
                <InputLabel id="appointments-status-filter-label">Status</InputLabel>
                <Select
                  labelId="appointments-status-filter-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as AppointmentStatus | 'ALL')
                    setPage(1)
                  }}
                >
                  <MenuItem value="ALL">All statuses</MenuItem>
                  <MenuItem value="REQUESTED">Requested</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 'auto' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setStatusFilter('ALL')
                  setPage(1)
                }}
                disabled={statusFilter === 'ALL'}
              >
                Clear Filter
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading ? <AppointmentListSkeleton /> : null}

      {!isLoading && appointmentsPage && appointmentsPage.content.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Book your first appointment from the doctor directory to see it here."
          actionLabel="Find Doctors"
          onAction={() => navigate('/patient/doctors')}
        />
      ) : null}

      {!isLoading && sections.length > 0 ? (
        <Stack spacing={1.8}>
          {sections.map((section) => (
            <Stack key={section.title} spacing={1.1}>
              <Typography variant="h3">{section.title}</Typography>
              <Grid container spacing={1.5}>
                {section.items.map((appointment) => (
                  <Grid key={appointment.appointmentId} size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 0.8 }}
                          >
                            <Typography variant="h4">{appointment.doctorName}</Typography>
                            <StatusChip status={appointment.status} />
                          </Stack>

                          <Typography color="text.secondary">{appointment.doctorSpecialization}</Typography>
                          <Typography>
                            Appointment: {formatLocalDate(appointment.appointmentDate)} at {appointment.appointmentTime.slice(0, 5)}
                          </Typography>
                          <Typography>Reason: {appointment.reason}</Typography>
                          <Typography color="text.secondary" variant="body2">
                            Created: {formatLocalDateTime(appointment.createdAt)}
                          </Typography>

                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.8, pt: 0.5 }}>
                            {isCancellableStatus(appointment.status) ? (
                              <Button
                                color="error"
                                variant="outlined"
                                onClick={() => setSelectedAppointment(appointment)}
                                disabled={isCancelling}
                              >
                                Cancel Appointment
                              </Button>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Action: {formatStatusLabel(appointment.status)} appointments cannot be cancelled.
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          ))}
        </Stack>
      ) : null}

      {!isLoading && appointmentsPage && appointmentsPage.totalPages > 1 ? (
        <Stack sx={{ alignItems: 'center', pb: 1 }}>
          <Pagination
            count={appointmentsPage.totalPages}
            page={page}
            onChange={(_, nextPage) => setPage(nextPage)}
            color="primary"
          />
        </Stack>
      ) : null}

      <Dialog
        open={Boolean(selectedAppointment)}
        onClose={() => {
          if (!isCancelling) {
            setSelectedAppointment(null)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancel appointment?</DialogTitle>
        <DialogContent>
          <Typography>
            This action will change the appointment status to CANCELLED and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAppointment(null)} disabled={isCancelling}>
            Keep Appointment
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleCancelConfirmed()} disabled={isCancelling}>
            {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
