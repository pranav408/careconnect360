import { Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useMediaQuery, useTheme } from '@mui/material'
import { StatusChip } from '../dashboard/StatusChip'
import { formatLocalDate, formatUsd } from '../dashboard/dashboardFormatters'
import type { InsurancePolicyResponse } from '../../types/insurance'
import { InsurancePolicyCard } from './InsurancePolicyCard'

interface InsurancePolicyTableProps {
  policies: InsurancePolicyResponse[]
}

function formatCoverage(value: number): string {
  return `${value.toFixed(2)}%`
}

export function InsurancePolicyTable({ policies }: InsurancePolicyTableProps) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  if (!isDesktop) {
    return (
      <Grid container spacing={1.4}>
        {policies.map((policy) => (
          <Grid key={policy.policyId} size={{ xs: 12, sm: 6 }}>
            <InsurancePolicyCard policy={policy} />
          </Grid>
        ))}
      </Grid>
    )
  }

  return (
    <TableContainer>
      <Table aria-label="Patient insurance policies">
        <TableHead>
          <TableRow>
            <TableCell>Provider</TableCell>
            <TableCell>Policy Number</TableCell>
            <TableCell>Coverage</TableCell>
            <TableCell>Deductible</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {policies.map((policy) => (
            <TableRow key={policy.policyId} hover>
              <TableCell>{policy.providerName}</TableCell>
              <TableCell sx={{ maxWidth: 220, wordBreak: 'break-all' }}>
                {policy.policyNumber}
              </TableCell>
              <TableCell>{formatCoverage(policy.coveragePercentage)}</TableCell>
              <TableCell>{formatUsd(policy.deductibleAmount)}</TableCell>
              <TableCell>{formatLocalDate(policy.startDate)}</TableCell>
              <TableCell>{formatLocalDate(policy.endDate)}</TableCell>
              <TableCell>
                <StatusChip status={policy.status} />
              </TableCell>
              <TableCell>
                {policy.createdAt ? policy.createdAt.replace('T', ' ') : 'Not provided'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
