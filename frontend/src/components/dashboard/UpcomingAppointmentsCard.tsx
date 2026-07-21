import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import { Card, CardContent, Divider, List, ListItem, Stack, Typography } from '@mui/material'
import { EmptyState } from '../common/EmptyState'
import type { DashboardAppointmentSummary } from '../../types/dashboard'
import { formatLocalDate } from './dashboardFormatters'
import { StatusChip } from './StatusChip'

interface UpcomingAppointmentsCardProps {
  appointments: DashboardAppointmentSummary[]
}

export function UpcomingAppointmentsCard({ appointments }: UpcomingAppointmentsCardProps) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        title="No upcoming appointments"
        description="Your schedule is clear right now. Upcoming appointments will appear here as soon as they are requested or confirmed."
        icon={<EventBusyRoundedIcon />}
      />
    )
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h4" component="h2">
            Upcoming Appointments
          </Typography>
          <Divider />

          <List disablePadding>
            {appointments.map((appointment, index) => (
              <ListItem
                key={appointment.appointmentId}
                disableGutters
                sx={{
                  py: 1.5,
                  display: 'block',
                  borderBottom:
                    index < appointments.length - 1 ? '1px solid rgba(214, 226, 236, 0.85)' : 'none',
                }}
              >
                <Stack spacing={1}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                    spacing={1}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      {appointment.doctorName} · {appointment.doctorSpecialization}
                    </Typography>
                    <StatusChip status={appointment.status} />
                  </Stack>

                  <Typography color="text.secondary">
                    {formatLocalDate(appointment.appointmentDate)} at {appointment.appointmentTime}
                  </Typography>

                  <Typography>
                    <Typography component="span" sx={{ fontWeight: 600 }}>
                      Reason:
                    </Typography>{' '}
                    {appointment.reason}
                  </Typography>
                </Stack>
              </ListItem>
            ))}
          </List>
        </Stack>
      </CardContent>
    </Card>
  )
}
