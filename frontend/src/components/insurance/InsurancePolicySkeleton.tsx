import { Card, CardContent, Grid, Skeleton, Stack } from '@mui/material'

export function InsurancePolicySkeleton() {
  return (
    <Stack spacing={1.6} aria-live="polite" aria-busy="true">
      <Card>
        <CardContent>
          <Skeleton variant="text" width="38%" height={36} />
          <Skeleton variant="text" width="70%" />
          <Grid container spacing={1.2} sx={{ mt: 0.6 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid key={`active-skeleton-${index}`} size={{ xs: 12, sm: 6 }}>
                <Skeleton variant="rounded" height={38} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={1.4}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid key={`policy-skeleton-${index}`} size={{ xs: 12, sm: 6 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="55%" />
                <Skeleton variant="text" width="75%" />
                <Skeleton variant="rounded" height={34} sx={{ mt: 1 }} />
                <Skeleton variant="rounded" height={34} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}
