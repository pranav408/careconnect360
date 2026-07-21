import { Card, CardContent, Grid, Typography } from '@mui/material'
import type { AppointmentStatus } from '../../types/appointment'

interface DoctorAppointmentStatusSummaryProps {
  counts: Record<AppointmentStatus, number>
}

const STATUS_SUMMARY_ORDER: Array<{ status: AppointmentStatus; label: string }> = [
  { status: 'REQUESTED', label: 'Requested' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'COMPLETED', label: 'Completed' },
  { status: 'REJECTED', label: 'Rejected' },
  { status: 'CANCELLED', label: 'Cancelled' },
]

export function DoctorAppointmentStatusSummary({ counts }: DoctorAppointmentStatusSummaryProps) {
  return (
    <Grid container spacing={1.5}>
      {STATUS_SUMMARY_ORDER.map((entry) => (
        <Grid key={entry.status} size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {entry.label}
              </Typography>
              <Typography variant="h3">{counts[entry.status]}</Typography>
              <Typography variant="caption" color="text.secondary">
                Current page
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
