import {
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { DashboardClaimSummary } from '../../types/dashboard'
import { EmptyState } from '../common/EmptyState'
import { formatLocalDateTime, formatUsd } from './dashboardFormatters'
import { StatusChip } from './StatusChip'

interface RecentClaimsSectionProps {
  claims: DashboardClaimSummary[]
}

export function RecentClaimsSection({ claims }: RecentClaimsSectionProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  if (claims.length === 0) {
    return (
      <EmptyState
        title="No recent claims"
        description="Claims created from completed appointments will be listed here with requested and approved amounts."
      />
    )
  }

  return (
    <Stack spacing={1.2}>
      <Typography variant="h4" component="h2">
        Recent Claims
      </Typography>

      {isMobile ? (
        <Stack spacing={1.2}>
          {claims.map((claim) => (
            <Card key={claim.claimId}>
              <CardContent>
                <Stack spacing={0.8}>
                  <Typography sx={{ fontWeight: 700 }}>Claim #{claim.claimId}</Typography>
                  <Typography color="text.secondary">Policy {claim.policyNumber}</Typography>
                  <Typography>Doctor: {claim.doctorName}</Typography>
                  <Typography>Requested: {formatUsd(claim.requestedAmount)}</Typography>
                  <Typography>Approved: {formatUsd(claim.approvedAmount)}</Typography>
                  <Typography>Patient Responsibility: {formatUsd(claim.patientResponsibility)}</Typography>
                  <Typography>Created: {formatLocalDateTime(claim.createdAt)}</Typography>
                  <StatusChip status={claim.status} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Recent claims table">
            <TableHead>
              <TableRow>
                <TableCell>Claim ID</TableCell>
                <TableCell>Policy Number</TableCell>
                <TableCell>Doctor</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Approved</TableCell>
                <TableCell>Patient Responsibility</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.claimId} hover>
                  <TableCell>{claim.claimId}</TableCell>
                  <TableCell>{claim.policyNumber}</TableCell>
                  <TableCell>{claim.doctorName}</TableCell>
                  <TableCell>{formatUsd(claim.requestedAmount)}</TableCell>
                  <TableCell>{formatUsd(claim.approvedAmount)}</TableCell>
                  <TableCell>{formatUsd(claim.patientResponsibility)}</TableCell>
                  <TableCell>
                    <StatusChip status={claim.status} />
                  </TableCell>
                  <TableCell>{formatLocalDateTime(claim.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}
