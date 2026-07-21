import { Card, CardContent, Grid, Skeleton, Stack } from '@mui/material'

export function DoctorAppointmentSkeleton() {
  return (
    <Stack spacing={2} aria-live="polite" aria-busy>
      <Skeleton variant="text" width="35%" height={40} />
      <Grid container spacing={1.5}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Grid key={`summary-skeleton-${index}`} size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="65%" />
                <Skeleton variant="text" width="40%" height={38} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={1.5}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid key={`appointment-card-skeleton-${index}`} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="rounded" height={36} />
                  <Skeleton variant="rounded" height={36} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}
