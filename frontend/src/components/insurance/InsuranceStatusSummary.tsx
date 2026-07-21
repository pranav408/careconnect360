import { Grid, Stack, Typography } from '@mui/material'
import type { PolicyStatus } from '../../types/insurance'

interface InsuranceStatusSummaryProps {
  counts: Record<PolicyStatus, number>
}

export function InsuranceStatusSummary({ counts }: InsuranceStatusSummaryProps) {
  return (
    <Grid container spacing={1.2}>
      <SummaryItem label="Pending" value={counts.PENDING} />
      <SummaryItem label="Active" value={counts.ACTIVE} />
      <SummaryItem label="Rejected" value={counts.REJECTED} />
      <SummaryItem label="Expired" value={counts.EXPIRED} />
    </Grid>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Stack
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 1.5,
          py: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontSize: '1.15rem' }}>
          {value}
        </Typography>
      </Stack>
    </Grid>
  )
}
