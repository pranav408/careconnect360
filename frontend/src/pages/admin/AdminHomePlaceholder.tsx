import { Chip, Grid, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useAuth } from '../../auth/useAuth'

export function AdminHomePlaceholder() {
  const { user } = useAuth()

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="h3">Welcome, {user?.displayName}</Typography>
        <Chip label="Administrator Workspace" color="info" sx={{ alignSelf: 'flex-start' }} />
        <Typography color="text.secondary">
          Monitor core platform operations while enhanced admin management views are finalized.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2.2 }}>
              <Skeleton variant="text" width="48%" />
              <Skeleton variant="rounded" height={38} sx={{ mt: 1.2 }} />
              <Skeleton variant="text" width="72%" sx={{ mt: 1 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography color="text.secondary">
        Next up: doctor onboarding, insurance review, claim verification, and system controls.
      </Typography>
    </Stack>
  )
}
