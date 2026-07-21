import { Card, CardContent, Skeleton, Stack } from '@mui/material'

export function AppointmentListSkeleton() {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`appointment-skeleton-${index}`}>
          <CardContent>
            <Stack spacing={1}>
              <Skeleton variant="text" width="45%" height={30} />
              <Skeleton variant="text" width="65%" />
              <Skeleton variant="text" width="55%" />
              <Skeleton variant="rounded" height={40} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
