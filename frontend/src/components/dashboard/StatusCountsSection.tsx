import { Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import type { StatusCountResponse } from '../../types/dashboard'
import { StatusChip } from './StatusChip'

interface StatusCountsSectionProps {
  appointmentCounts: StatusCountResponse[]
  claimCounts: StatusCountResponse[]
}

export function StatusCountsSection({
  appointmentCounts,
  claimCounts,
}: StatusCountsSectionProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <CountsCard title="Appointment Status Summary" counts={appointmentCounts} />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <CountsCard title="Claim Status Summary" counts={claimCounts} />
      </Grid>
    </Grid>
  )
}

function CountsCard({ title, counts }: { title: string; counts: StatusCountResponse[] }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.2}>
          <Typography variant="h4" component="h2">
            {title}
          </Typography>

          {counts.map((item) => (
            <Stack
              key={item.status}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <StatusChip status={item.status} />
              <Typography sx={{ fontWeight: 700 }} aria-label={`${item.status} count ${item.count}`}>
                {item.count}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
