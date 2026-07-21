import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import { Alert, Button, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material'
import { EmptyState } from '../common/EmptyState'
import { StatusChip } from '../dashboard/StatusChip'
import { formatLocalDate, formatUsd } from '../dashboard/dashboardFormatters'
import type { InsurancePolicyResponse } from '../../types/insurance'

interface ActiveInsuranceCardProps {
  policy: InsurancePolicyResponse | null
  errorMessage: string | null
  onRetry: () => void
  onAddPolicy: () => void
}

function formatCoverage(value: number): string {
  return `${value.toFixed(2)}%`
}

export function ActiveInsuranceCard({
  policy,
  errorMessage,
  onRetry,
  onAddPolicy,
}: ActiveInsuranceCardProps) {
  if (errorMessage) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" color="inherit" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {errorMessage}
      </Alert>
    )
  }

  if (!policy) {
    return (
      <EmptyState
        icon={<HealthAndSafetyRoundedIcon />}
        title="No active insurance policy"
        description="You currently have no active policy. You can submit a new policy for admin review."
        actionLabel="Add Insurance Policy"
        onAction={onAddPolicy}
      />
    )
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.6}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 0.8 }}
          >
            <Typography variant="h4" component="h2">
              Active Policy
            </Typography>
            <StatusChip status={policy.status} />
          </Stack>

          <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            Policy {policy.policyNumber}
          </Typography>

          <Divider />

          <Grid container spacing={1.3}>
            <Field label="Provider" value={policy.providerName} />
            <Field label="Coverage" value={formatCoverage(policy.coveragePercentage)} />
            <Field label="Deductible" value={formatUsd(policy.deductibleAmount)} />
            <Field label="Start Date" value={formatLocalDate(policy.startDate)} />
            <Field label="End Date" value={formatLocalDate(policy.endDate)} />
            <Field label="Status" value="ACTIVE" />
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{value}</Typography>
    </Grid>
  )
}
