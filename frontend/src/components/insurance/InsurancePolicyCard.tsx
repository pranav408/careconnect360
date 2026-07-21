import { Card, CardContent, Divider, Stack, Typography } from '@mui/material'
import { StatusChip } from '../dashboard/StatusChip'
import { formatLocalDate, formatUsd } from '../dashboard/dashboardFormatters'
import type { InsurancePolicyResponse } from '../../types/insurance'

interface InsurancePolicyCardProps {
  policy: InsurancePolicyResponse
}

function formatCoverage(value: number): string {
  return `${value.toFixed(2)}%`
}

export function InsurancePolicyCard({ policy }: InsurancePolicyCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.1}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 0.7 }}
          >
            <Typography variant="h4" sx={{ fontSize: '1.06rem' }}>
              {policy.providerName}
            </Typography>
            <StatusChip status={policy.status} />
          </Stack>

          <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            Policy {policy.policyNumber}
          </Typography>

          <Divider />

          <Typography>Coverage: {formatCoverage(policy.coveragePercentage)}</Typography>
          <Typography>Deductible: {formatUsd(policy.deductibleAmount)}</Typography>
          <Typography>Start Date: {formatLocalDate(policy.startDate)}</Typography>
          <Typography>End Date: {formatLocalDate(policy.endDate)}</Typography>

          {policy.createdAt ? (
            <Typography color="text.secondary" variant="body2">
              Submitted: {policy.createdAt.replace('T', ' ')}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
