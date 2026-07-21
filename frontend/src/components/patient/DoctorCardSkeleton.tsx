import { Card, CardContent, Grid, Skeleton, Stack } from '@mui/material'

export function DoctorCardSkeleton() {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Skeleton variant="text" width="70%" height={34} />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="55%" />
            <Skeleton variant="rounded" height={38} />
            <Skeleton variant="rounded" height={42} />
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )
}
