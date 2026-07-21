import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  completeDoctorAppointment,
  confirmDoctorAppointment,
  getDoctorAppointments,
  rejectDoctorAppointment,
} from '../../api/doctorAppointmentApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { AppointmentActionDialog } from '../../components/doctor/AppointmentActionDialog'
import { DoctorAppointmentCard } from '../../components/doctor/DoctorAppointmentCard'
import { DoctorAppointmentSkeleton } from '../../components/doctor/DoctorAppointmentSkeleton'
import { DoctorAppointmentStatusSummary } from '../../components/doctor/DoctorAppointmentStatusSummary'
import type { AppointmentResponse, AppointmentStatus, DoctorAppointmentsResponse } from '../../types/appointment'

type AppointmentAction = 'confirm' | 'reject' | 'complete'

const PAGE_SIZE = 8

interface PendingAction {
  action: AppointmentAction
  appointment: AppointmentResponse
}

function emptyStatusCounts(): Record<AppointmentStatus, number> {
  return {
    REQUESTED: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  }
}

function toAppointmentTimeLabel(localTime: string): string {
  const [hourPart, minutePart] = localTime.split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return localTime
  }

  const meridian = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12
  const normalizedMinute = String(minute).padStart(2, '0')
  return `${normalizedHour}:${normalizedMinute} ${meridian}`
}

function toActionErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)
  const fallbackMessage = getApiErrorMessage(error)

  if (status === 403) {
    return 'You are not allowed to manage this appointment.'
  }

  if (status === 404) {
    return 'Appointment not found. Refresh the list and try again.'
  }

  if (status === 409) {
    return fallbackMessage
  }

  if (status && status >= 500) {
    return 'The server could not process this appointment action right now. Please retry.'
  }

  return fallbackMessage
}

export function DoctorAppointmentsPage() {
  const [appointmentsPage, setAppointmentsPage] = useState<DoctorAppointmentsResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionAppointmentId, setActionAppointmentId] = useState<number | null>(null)
  const actionInFlightRef = useRef(false)

  const loadAppointments = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getDoctorAppointments({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: page - 1,
        size: PAGE_SIZE,
        sort: 'appointmentDate,asc',
      })

      setAppointmentsPage(response)
    } catch (error) {
      setErrorMessage(toActionErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    queueMicrotask(() => {
      void loadAppointments()
    })
  }, [loadAppointments])

  const appointments = useMemo(() => appointmentsPage?.content ?? [], [appointmentsPage?.content])

  const statusCounts = useMemo(() => {
    const counts = emptyStatusCounts()

    for (const appointment of appointments) {
      counts[appointment.status] += 1
    }

    return counts
  }, [appointments])

  const handleAction = useCallback(
    async (action: AppointmentAction, appointmentId: number) => {
      if (actionInFlightRef.current || actionAppointmentId !== null) {
        return
      }

      actionInFlightRef.current = true
      setActionAppointmentId(appointmentId)
      setErrorMessage(null)

      try {
        let updated: AppointmentResponse

        if (action === 'confirm') {
          updated = await confirmDoctorAppointment(appointmentId)
          setSnackbarMessage('Appointment confirmed successfully.')
        } else if (action === 'reject') {
          updated = await rejectDoctorAppointment(appointmentId)
          setSnackbarMessage('Appointment rejected successfully.')
        } else {
          updated = await completeDoctorAppointment(appointmentId)
          setSnackbarMessage('Appointment completed and claim submitted successfully.')
        }

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

        setPendingAction(null)
      } catch (error) {
        setErrorMessage(toActionErrorMessage(error))
      } finally {
        actionInFlightRef.current = false
        setActionAppointmentId(null)
      }
    },
    [actionAppointmentId],
  )

  const isActionInProgress = actionAppointmentId !== null

  if (errorMessage && !appointmentsPage && !isLoading) {
    return (
      <PageError
        title="Unable to load doctor appointments"
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
        <Typography variant="h2">Doctor Appointments</Typography>
        <Chip label="Doctor Workflow" color="secondary" sx={{ alignSelf: 'flex-start' }} />
        <Typography color="text.secondary">
          Review assigned appointments, confirm or reject requests, and complete confirmed visits. Completion automatically triggers backend claim submission.
        </Typography>
      </Stack>

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
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="doctor-appointments-status-filter">Status</InputLabel>
                <Select
                  labelId="doctor-appointments-status-filter"
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
            <Grid size={{ xs: 12, md: 'auto' }}>
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

      {isLoading ? (
        <>
          <Typography role="status" aria-live="polite" sx={{ position: 'absolute', left: -10000 }}>
            Loading doctor appointments
          </Typography>
          <DoctorAppointmentSkeleton />
        </>
      ) : null}

      {!isLoading ? <DoctorAppointmentStatusSummary counts={statusCounts} /> : null}

      {!isLoading && appointments.length === 0 ? (
        <EmptyState
          title="No assigned appointments found"
          description="No appointments match this status filter for the current page. Adjust the filter or retry shortly."
        />
      ) : null}

      {!isLoading && appointments.length > 0 ? (
        <Grid container spacing={1.5}>
          {appointments.map((appointment) => (
            <Grid key={appointment.appointmentId} size={{ xs: 12, md: 6 }}>
              <DoctorAppointmentCard
                appointment={appointment}
                appointmentTimeLabel={toAppointmentTimeLabel(appointment.appointmentTime)}
                isActionDisabled={isActionInProgress}
                onConfirm={(selected) =>
                  setPendingAction({
                    action: 'confirm',
                    appointment: selected,
                  })
                }
                onReject={(selected) =>
                  setPendingAction({
                    action: 'reject',
                    appointment: selected,
                  })
                }
                onComplete={(selected) =>
                  setPendingAction({
                    action: 'complete',
                    appointment: selected,
                  })
                }
              />
            </Grid>
          ))}
        </Grid>
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

      <AppointmentActionDialog
        open={pendingAction?.action === 'confirm'}
        title="Confirm appointment request"
        description="Confirming this request changes the appointment status to CONFIRMED."
        confirmLabel="Confirm Appointment"
        appointmentContext={
          pendingAction?.action === 'confirm'
            ? {
                patientName: pendingAction.appointment.patientName,
                appointmentDate: pendingAction.appointment.appointmentDate,
                appointmentTimeLabel: toAppointmentTimeLabel(pendingAction.appointment.appointmentTime),
              }
            : null
        }
        loading={isActionInProgress}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.action === 'confirm') {
            void handleAction('confirm', pendingAction.appointment.appointmentId)
          }
        }}
      />

      <AppointmentActionDialog
        open={pendingAction?.action === 'reject'}
        title="Reject appointment request"
        description="This request will be rejected. The patient will need to submit a new request for another slot."
        confirmLabel="Reject Appointment"
        confirmColor="error"
        appointmentContext={
          pendingAction?.action === 'reject'
            ? {
                patientName: pendingAction.appointment.patientName,
                appointmentDate: pendingAction.appointment.appointmentDate,
                appointmentTimeLabel: toAppointmentTimeLabel(pendingAction.appointment.appointmentTime),
              }
            : null
        }
        loading={isActionInProgress}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.action === 'reject') {
            void handleAction('reject', pendingAction.appointment.appointmentId)
          }
        }}
      />

      <AppointmentActionDialog
        open={pendingAction?.action === 'complete'}
        title="Complete appointment"
        description="Completing this appointment will mark it as COMPLETED and automatically create a SUBMITTED insurance claim in the backend."
        confirmLabel="Complete Appointment"
        confirmColor="warning"
        appointmentContext={
          pendingAction?.action === 'complete'
            ? {
                patientName: pendingAction.appointment.patientName,
                appointmentDate: pendingAction.appointment.appointmentDate,
                appointmentTimeLabel: toAppointmentTimeLabel(pendingAction.appointment.appointmentTime),
              }
            : null
        }
        loading={isActionInProgress}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.action === 'complete') {
            void handleAction('complete', pendingAction.appointment.appointmentId)
          }
        }}
      />

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={4200}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
