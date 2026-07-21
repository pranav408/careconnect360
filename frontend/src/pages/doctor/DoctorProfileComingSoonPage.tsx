import { Chip, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../components/common/EmptyState'

export function DoctorProfileComingSoonPage() {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.6}>
        <Typography variant="h2">Doctor Profile</Typography>
        <Chip label="Coming Soon" color="default" sx={{ alignSelf: 'flex-start' }} />
      </Stack>
      <EmptyState
        title="Doctor profile tools are coming soon"
        description="Profile editing is intentionally held for a later phase while appointment workflow delivery remains the priority."
      />
    </Stack>
  )
}
