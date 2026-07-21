import { Card, CardContent, Grid, Skeleton, Stack } from '@mui/material'

export function DashboardSkeleton() {
  return (
    <Stack spacing={2.2}>
      <Card>
        <CardContent>
          <Skeleton variant="text" width="45%" height={40} />
          <Skeleton variant="text" width="70%" height={24} />
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="rounded" height={38} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="65%" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rounded" height={180} sx={{ mt: 1.2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rounded" height={180} sx={{ mt: 1.2 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
