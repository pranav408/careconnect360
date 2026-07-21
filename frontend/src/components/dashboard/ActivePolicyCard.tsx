import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import { Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material'
import { EmptyState } from '../common/EmptyState'
import type { DashboardPolicySummary } from '../../types/dashboard'
import { formatLocalDate, formatStatusLabel, formatUsd } from './dashboardFormatters'
import { StatusChip } from './StatusChip'

interface ActivePolicyCardProps {
  policy: DashboardPolicySummary | null
}

export function ActivePolicyCard({ policy }: ActivePolicyCardProps) {
  if (!policy) {
    return (
      <EmptyState
        title="No active insurance policy"
        description="You do not currently have an active policy in your dashboard. Once your policy is activated, full coverage details will appear here."
        icon={<HealthAndSafetyRoundedIcon />}
      />
    )
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h4" component="h2">
              Active Insurance Policy
            </Typography>
            <StatusChip status={policy.status} />
          </Stack>

          <Divider />

          <Grid container spacing={1.5}>
            <PolicyField label="Provider" value={policy.providerName} />
            <PolicyField label="Policy Number" value={policy.policyNumber} />
            <PolicyField label="Coverage" value={`${policy.coveragePercentage.toFixed(2)}%`} />
            <PolicyField label="Deductible" value={formatUsd(policy.deductibleAmount)} />
            <PolicyField label="Start Date" value={formatLocalDate(policy.startDate)} />
            <PolicyField label="End Date" value={formatLocalDate(policy.endDate)} />
            <PolicyField label="Status" value={formatStatusLabel(policy.status)} />
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  )
}

function PolicyField({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{value}</Typography>
    </Grid>
  )
}
