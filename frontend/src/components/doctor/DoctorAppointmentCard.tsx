import { Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { StatusChip } from '../dashboard/StatusChip'
import { formatLocalDate, formatLocalDateTime } from '../dashboard/dashboardFormatters'
import type { AppointmentResponse, AppointmentStatus } from '../../types/appointment'

interface DoctorAppointmentCardProps {
  appointment: AppointmentResponse
  appointmentTimeLabel: string
  isActionDisabled: boolean
  onConfirm: (appointment: AppointmentResponse) => void
  onReject: (appointment: AppointmentResponse) => void
  onComplete: (appointment: AppointmentResponse) => void
}

function availableActions(status: AppointmentStatus): Array<'confirm' | 'reject' | 'complete'> {
  if (status === 'REQUESTED') {
    return ['confirm', 'reject']
  }

  if (status === 'CONFIRMED') {
    return ['complete']
  }

  return []
}

export function DoctorAppointmentCard({
  appointment,
  appointmentTimeLabel,
  isActionDisabled,
  onConfirm,
  onReject,
  onComplete,
}: DoctorAppointmentCardProps) {
  const actions = availableActions(appointment.status)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.1}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 0.8 }}>
            <Typography variant="h4">{appointment.patientName}</Typography>
            <StatusChip status={appointment.status} />
          </Stack>

          <Grid container spacing={0.6}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography>{formatLocalDate(appointment.appointmentDate)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Time
              </Typography>
              <Typography>{appointmentTimeLabel}</Typography>
            </Grid>
          </Grid>

          <Typography variant="body2" color="text.secondary">
            Reason
          </Typography>
          <Typography>{appointment.reason}</Typography>

          <Typography variant="body2" color="text.secondary">
            Created: {formatLocalDateTime(appointment.createdAt)}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 0.6 }}>
            {actions.includes('confirm') ? (
              <Button
                variant="contained"
                onClick={() => onConfirm(appointment)}
                disabled={isActionDisabled}
                fullWidth
              >
                Confirm
              </Button>
            ) : null}

            {actions.includes('reject') ? (
              <Button
                variant="outlined"
                color="error"
                onClick={() => onReject(appointment)}
                disabled={isActionDisabled}
                fullWidth
              >
                Reject
              </Button>
            ) : null}

            {actions.includes('complete') ? (
              <Button
                variant="contained"
                color="success"
                onClick={() => onComplete(appointment)}
                disabled={isActionDisabled}
                fullWidth
              >
                Complete
              </Button>
            ) : null}

            {actions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No workflow action available for this status.
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
