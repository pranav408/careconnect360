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
import type { DashboardPaymentSummary } from '../../types/dashboard'
import { EmptyState } from '../common/EmptyState'
import { formatLocalDateTime, formatUsd } from './dashboardFormatters'
import { StatusChip } from './StatusChip'

interface RecentPaymentsSectionProps {
  payments: DashboardPaymentSummary[]
}

export function RecentPaymentsSection({ payments }: RecentPaymentsSectionProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payment history yet"
        description="Completed and failed payment attempts will appear here once payments are processed."
      />
    )
  }

  return (
    <Stack spacing={1.2}>
      <Typography variant="h4" component="h2">
        Recent Payments
      </Typography>

      {isMobile ? (
        <Stack spacing={1.2}>
          {payments.map((payment) => (
            <Card key={payment.paymentId}>
              <CardContent>
                <Stack spacing={0.8}>
                  <Typography sx={{ fontWeight: 700 }}>{payment.transactionReference}</Typography>
                  <Typography>Claim ID: {payment.claimId}</Typography>
                  <Typography>Amount: {formatUsd(payment.amount)}</Typography>
                  <Typography>Paid At: {formatLocalDateTime(payment.paidAt)}</Typography>
                  {payment.failureReason ? (
                    <Typography color="error.main">Failure Reason: {payment.failureReason}</Typography>
                  ) : null}
                  <StatusChip status={payment.status} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Recent payments table">
            <TableHead>
              <TableRow>
                <TableCell>Transaction Reference</TableCell>
                <TableCell>Claim ID</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Paid At</TableCell>
                <TableCell>Failure Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.paymentId} hover>
                  <TableCell>{payment.transactionReference}</TableCell>
                  <TableCell>{payment.claimId}</TableCell>
                  <TableCell>{formatUsd(payment.amount)}</TableCell>
                  <TableCell>
                    <StatusChip status={payment.status} />
                  </TableCell>
                  <TableCell>{formatLocalDateTime(payment.paidAt)}</TableCell>
                  <TableCell>{payment.failureReason || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}
