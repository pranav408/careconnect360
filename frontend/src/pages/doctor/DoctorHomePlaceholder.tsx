import { Chip, Grid, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useAuth } from '../../auth/useAuth'

export function DoctorHomePlaceholder() {
  const { user } = useAuth()

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="h3">Hello Dr. {user?.displayName}</Typography>
        <Chip label="Doctor Workspace" color="secondary" sx={{ alignSelf: 'flex-start' }} />
        <Typography color="text.secondary">
          Review your care operations from one place. Detailed appointment flows are coming next.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Paper sx={{ p: 2.2 }}>
              <Skeleton variant="text" width="55%" />
              <Skeleton variant="rounded" height={36} sx={{ mt: 1.2 }} />
              <Skeleton variant="text" width="70%" sx={{ mt: 1 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography color="text.secondary">
        Next up: confirmation and completion workflows, plus deeper profile tooling.
      </Typography>
    </Stack>
  )
}
