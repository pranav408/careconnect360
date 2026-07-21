import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClaimPayment, listMyPayments } from '../../api/patientPaymentApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { listMyClaims } from '../../api/patientClaimApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { StatusChip } from '../../components/dashboard/StatusChip'
import { formatLocalDateTime, formatStatusLabel } from '../../components/dashboard/dashboardFormatters'
import type { PatientClaimResponse } from '../../types/claim'
import type {
  CreatePaymentRequest,
  MockPaymentOutcome,
  PatientPaymentHistoryQuery,
  PatientPaymentResponse,
  PatientPaymentSortField,
  PatientPaymentsPageResponse,
  PaymentResultResponse,
  PaymentStatus,
  SortDirection,
} from '../../types/payment'

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: `${PatientPaymentSortField},${SortDirection}` = 'createdAt,desc'
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const APPROVED_CLAIM_FETCH_SIZE = 50
const PAYMENT_CLAIM_ID_FETCH_SIZE = 100

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type PaymentStatusFilter = PaymentStatus | 'ALL'

interface HistoryFilters {
  status: PaymentStatusFilter
}

interface SortOption {
  value: `${PatientPaymentSortField},${SortDirection}`
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'amount,desc', label: 'Amount highest first' },
  { value: 'amount,asc', label: 'Amount lowest first' },
  { value: 'status,asc', label: 'Status A-Z' },
  { value: 'paidAt,desc', label: 'Paid timestamp newest first' },
  { value: 'transactionReference,asc', label: 'Transaction reference A-Z' },
  { value: 'paymentId,desc', label: 'Payment ID descending' },
]

interface SnackbarState {
  severity: 'success' | 'error'
  message: string
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '$0.00'
  }

  return usdFormatter.format(value)
}

function formatFailureReason(payment: Pick<PatientPaymentResponse, 'status' | 'failureReason'>): string {
  if (payment.status !== 'FAILED') {
    return 'N/A'
  }

  const normalized = payment.failureReason?.trim()
  if (!normalized) {
    return 'Payment was not completed.'
  }

  return normalized
}

function createEmptyPage(): PatientPaymentsPageResponse {
  return {
    content: [],
    pageable: {
      pageNumber: 0,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: {
        empty: false,
        sorted: true,
        unsorted: false,
      },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: 0,
    totalPages: 0,
    last: true,
    size: DEFAULT_PAGE_SIZE,
    number: 0,
    sort: {
      empty: false,
      sorted: true,
      unsorted: false,
    },
    first: true,
    numberOfElements: 0,
    empty: true,
  }
}

function buildHistoryQuery(
  filters: HistoryFilters,
  page: number,
  size: number,
  sort: `${PatientPaymentSortField},${SortDirection}`,
): PatientPaymentHistoryQuery {
  const query: PatientPaymentHistoryQuery = {
    page,
    size,
    sort,
  }

  if (filters.status !== 'ALL') {
    query.status = filters.status
  }

  return query
}

function countByStatus(content: PatientPaymentResponse[]): Record<PaymentStatus, number> {
  const counts: Record<PaymentStatus, number> = {
    INITIATED: 0,
    SUCCESS: 0,
    FAILED: 0,
  }

  for (const payment of content) {
    counts[payment.status] += 1
  }

  return counts
}

function toHistoryErrorTitle(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted'
  }

  if (status === 400) {
    return 'Invalid payment query'
  }

  if (status && status >= 500) {
    return 'Payment service unavailable'
  }

  return 'Unable to load payments'
}

function toHistoryErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Your account is not allowed to access patient payments.'
  }

  return getApiErrorMessage(error)
}

function toActionErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 400) {
    return getApiErrorMessage(error)
  }

  if (status === 403) {
    return 'You are not allowed to pay this claim.'
  }

  if (status === 404) {
    return 'This claim could not be found. Refreshing the page is recommended.'
  }

  if (status === 409) {
    return getApiErrorMessage(error)
  }

  if (status && status >= 500) {
    return 'The payment service is temporarily unavailable. Please try again.'
  }

  return getApiErrorMessage(error)
}

function toApprovedClaimsErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'You are not allowed to view claim balances for payment.'
  }

  return getApiErrorMessage(error)
}

function normalizeNumber(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0
  }

  return value
}

function hasPositiveResponsibility(claim: PatientClaimResponse): boolean {
  return normalizeNumber(claim.patientResponsibility) > 0
}

function isApprovedClaim(claim: PatientClaimResponse): boolean {
  return claim.status === 'APPROVED'
}

function LoadingSkeleton() {
  return (
    <Stack spacing={2} aria-label="Loading payments">
      <Skeleton variant="text" width="36%" height={48} />
      <Grid container spacing={1.2}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 4 }}>
            <Skeleton variant="rounded" height={96} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={260} />
      <Skeleton variant="rounded" height={300} />
    </Stack>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Card>
        <CardContent sx={{ py: 1.8 }}>
          <Stack spacing={0.6}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontSize: '1.2rem' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Current page
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )
}

async function fetchAllApprovedClaims(): Promise<PatientClaimResponse[]> {
  const claims: PatientClaimResponse[] = []
  let page = 0

  while (true) {
    const response = await listMyClaims({
      status: 'APPROVED',
      page,
      size: APPROVED_CLAIM_FETCH_SIZE,
      sort: 'createdAt,desc',
    })

    claims.push(...response.content)

    if (response.last || page + 1 >= response.totalPages) {
      break
    }

    page += 1
  }

  return claims
}

async function fetchAllPaymentClaimIds(): Promise<Set<number>> {
  const claimIds = new Set<number>()
  let page = 0

  while (true) {
    const response = await listMyPayments({
      page,
      size: PAYMENT_CLAIM_ID_FETCH_SIZE,
      sort: 'createdAt,desc',
    })

    for (const payment of response.content) {
      if (typeof payment.claimId === 'number') {
        claimIds.add(payment.claimId)
      }
    }

    if (response.last || page + 1 >= response.totalPages) {
      break
    }

    page += 1
  }

  return claimIds
}

export function PatientPaymentsPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))

  const [draftFilters, setDraftFilters] = useState<HistoryFilters>({ status: 'ALL' })
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>({ status: 'ALL' })
  const [selectedSort, setSelectedSort] = useState<`${PatientPaymentSortField},${SortDirection}`>(
    DEFAULT_SORT,
  )
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [paymentPage, setPaymentPage] = useState<PatientPaymentsPageResponse | null>(null)
  const [approvedClaims, setApprovedClaims] = useState<PatientClaimResponse[]>([])
  const [paymentClaimIds, setPaymentClaimIds] = useState<Set<number>>(new Set())

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyErrorTitle, setHistoryErrorTitle] = useState('Unable to load payments')
  const [approvedClaimsError, setApprovedClaimsError] = useState<string | null>(null)

  const [selectedClaim, setSelectedClaim] = useState<PatientClaimResponse | null>(null)
  const [paymentOutcome, setPaymentOutcome] = useState<MockPaymentOutcome>('SUCCESS')
  const [failureReasonInput, setFailureReasonInput] = useState('')
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResultResponse | null>(null)

  const [selectedPayment, setSelectedPayment] = useState<PatientPaymentResponse | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const hasLoadedOnceRef = useRef(false)

  const loadPageData = useCallback(async () => {
    const historyQuery = buildHistoryQuery(appliedFilters, page, pageSize, selectedSort)

    setHistoryError(null)
    setApprovedClaimsError(null)

    if (hasLoadedOnceRef.current) {
      setIsReloading(true)
    }

    try {
      const [history, claims, claimIds] = await Promise.all([
        listMyPayments(historyQuery),
        fetchAllApprovedClaims(),
        fetchAllPaymentClaimIds(),
      ])

      setPaymentPage(history)
      setApprovedClaims(claims)
      setPaymentClaimIds(claimIds)
    } catch (error) {
      setHistoryErrorTitle(toHistoryErrorTitle(error))
      setHistoryError(toHistoryErrorMessage(error))
      setApprovedClaimsError(toApprovedClaimsErrorMessage(error))
    } finally {
      hasLoadedOnceRef.current = true
      setIsInitialLoading(false)
      setIsReloading(false)
    }
  }, [appliedFilters, page, pageSize, selectedSort])

  useEffect(() => {
    queueMicrotask(() => {
      void loadPageData()
    })
  }, [loadPageData])

  const safePaymentPage = paymentPage ?? createEmptyPage()
  const pageCounts = useMemo(() => countByStatus(safePaymentPage.content), [safePaymentPage.content])

  const appliedSummary = useMemo(() => {
    if (appliedFilters.status === 'ALL') {
      return 'Showing all payment statuses'
    }

    return `Status: ${formatStatusLabel(appliedFilters.status)}`
  }, [appliedFilters.status])

  const payableClaims = useMemo(() => {
    return approvedClaims.filter(
      (claim) => isApprovedClaim(claim) && hasPositiveResponsibility(claim) && !paymentClaimIds.has(claim.claimId),
    )
  }, [approvedClaims, paymentClaimIds])

  const hasAnyFilter = appliedFilters.status !== 'ALL'
  const showHistoryEmpty = !isInitialLoading && !historyError && safePaymentPage.content.length === 0

  const paymentAlreadyExists = useMemo(() => {
    if (!selectedClaim) {
      return false
    }

    return paymentClaimIds.has(selectedClaim.claimId)
  }, [paymentClaimIds, selectedClaim])

  const canSubmit = useMemo(() => {
    if (!selectedClaim || isSubmittingPayment || paymentAlreadyExists) {
      return false
    }

    if (!hasPositiveResponsibility(selectedClaim)) {
      return false
    }

    if (paymentOutcome === 'FAILURE' && failureReasonInput.trim().length === 0) {
      return false
    }

    return true
  }, [failureReasonInput, isSubmittingPayment, paymentAlreadyExists, paymentOutcome, selectedClaim])

  const resetPaymentDialogState = useCallback(() => {
    setPaymentOutcome('SUCCESS')
    setFailureReasonInput('')
    setPaymentActionError(null)
    setIsSubmittingPayment(false)
    setPaymentResult(null)
  }, [])

  const closePaymentDialog = useCallback(() => {
    if (isSubmittingPayment) {
      return
    }

    setSelectedClaim(null)
    resetPaymentDialogState()
  }, [isSubmittingPayment, resetPaymentDialogState])

  const openPaymentDialog = useCallback(
    (claim: PatientClaimResponse) => {
      setSelectedClaim(claim)
      resetPaymentDialogState()
    },
    [resetPaymentDialogState],
  )

  const refreshAfterPaymentResult = useCallback(async () => {
    await loadPageData()
  }, [loadPageData])

  const handleSubmitPayment = useCallback(async () => {
    if (!selectedClaim || !canSubmit) {
      return
    }

    setPaymentActionError(null)
    setIsSubmittingPayment(true)

    const request: CreatePaymentRequest = {
      outcome: paymentOutcome,
    }

    if (paymentOutcome === 'FAILURE') {
      request.failureReason = failureReasonInput.trim()
    }

    try {
      const response = await createClaimPayment(selectedClaim.claimId, request)
      setPaymentResult(response)

      if (response.status === 'SUCCESS') {
        setSnackbar({
          severity: 'success',
          message: `Payment ${response.paymentId} completed successfully.`,
        })
      } else {
        setSnackbar({
          severity: 'error',
          message: `Payment ${response.paymentId} was not completed.`,
        })
      }

      await refreshAfterPaymentResult()
    } catch (error) {
      setPaymentActionError(toActionErrorMessage(error))

      if (getApiErrorStatus(error) === 409) {
        await refreshAfterPaymentResult()
      }
    } finally {
      setIsSubmittingPayment(false)
    }
  }, [canSubmit, failureReasonInput, paymentOutcome, refreshAfterPaymentResult, selectedClaim])

  if (isInitialLoading && !paymentPage) {
    return <LoadingSkeleton />
  }

  if (historyError && !paymentPage) {
    return <PageError title={historyErrorTitle} message={historyError} onRetry={() => void loadPageData()} />
  }

  return (
    <Stack spacing={2.2} aria-busy={isReloading}>
      <Stack spacing={0.6}>
        <Typography variant="h2">Payments</Typography>
        <Typography color="text.secondary">
          Complete claim payments through the application&apos;s deterministic mock payment workflow.
        </Typography>
        <Chip label="Patient" color="secondary" sx={{ width: 'fit-content' }} />
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={0.9}>
            <Typography variant="h3">Mock payment workflow</Typography>
            <Typography color="text.secondary">
              Payment amount is always derived by the backend from the approved claim&apos;s patient responsibility.
            </Typography>
            <Typography color="text.secondary">
              This workflow does not collect card numbers, CVV, routing numbers, or bank account credentials.
            </Typography>
            <Typography color="text.secondary">
              A successful response may mark the claim as Paid. Failed responses keep the claim status unchanged.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.2}>
        <SummaryCard label="Initiated" value={pageCounts.INITIATED} />
        <SummaryCard label="Success" value={pageCounts.SUCCESS} />
        <SummaryCard label="Failed" value={pageCounts.FAILED} />
      </Grid>

      <Card>
        <CardContent>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="payment-status-filter-label">Status</InputLabel>
                <Select
                  labelId="payment-status-filter-label"
                  label="Status"
                  value={draftFilters.status}
                  onChange={(event) => {
                    setDraftFilters((current) => ({
                      ...current,
                      status: event.target.value as PaymentStatusFilter,
                    }))
                  }}
                >
                  <MenuItem value="ALL">All statuses</MenuItem>
                  <MenuItem value="INITIATED">Initiated</MenuItem>
                  <MenuItem value="SUCCESS">Success</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="payment-sort-label">Sort</InputLabel>
                <Select
                  labelId="payment-sort-label"
                  label="Sort"
                  value={selectedSort}
                  onChange={(event) => {
                    setSelectedSort(event.target.value as `${PatientPaymentSortField},${SortDirection}`)
                    setPage(0)
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="payment-page-size-label">Page Size</InputLabel>
                <Select
                  labelId="payment-page-size-label"
                  label="Page Size"
                  value={String(pageSize)}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPage(0)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={String(option)}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<SearchRoundedIcon />}
                  onClick={() => {
                    setAppliedFilters(draftFilters)
                    setPage(0)
                  }}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Search
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<FilterAltOffRoundedIcon />}
                  onClick={() => {
                    const next = { status: 'ALL' as const }
                    setDraftFilters(next)
                    setAppliedFilters(next)
                    setSelectedSort(DEFAULT_SORT)
                    setPage(0)
                    setPageSize(DEFAULT_PAGE_SIZE)
                  }}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Clear Filters
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography color="text.secondary" variant="body2">
        {appliedSummary}
      </Typography>

      {isReloading ? <LinearProgress aria-label="Refreshing payments" /> : null}

      {historyError && paymentPage ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadPageData()}>
              Retry
            </Button>
          }
        >
          {historyError}
        </Alert>
      ) : null}

      <Stack spacing={1.2}>
        <Typography variant="h3" component="h2">
          Payable claims
        </Typography>

        {approvedClaimsError ? <Alert severity="error">{approvedClaimsError}</Alert> : null}

        {approvedClaims.length === 0 ? (
          <EmptyState
            icon={<CreditCardRoundedIcon />}
            title="No approved claims awaiting payment"
            description="Approved claims with a positive patient responsibility will appear here for payment." 
          />
        ) : null}

        {approvedClaims.length > 0 && payableClaims.length === 0 ? (
          <EmptyState
            icon={<CreditCardRoundedIcon />}
            title="All patient balances are already resolved"
            description="No payment is due for approved zero-balance claims, and claims with an existing payment record cannot be paid again."
          />
        ) : null}

        {payableClaims.length > 0 ? (
          isDesktop ? (
            <TableContainer>
              <Table aria-label="Payable claims table">
                <TableHead>
                  <TableRow>
                    <TableCell>Claim ID</TableCell>
                    <TableCell>Appointment ID</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Policy Number</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell>Approved</TableCell>
                    <TableCell>Patient Responsibility</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvedClaims.map((claim) => {
                    const hasPayment = paymentClaimIds.has(claim.claimId)
                    const dueAmount = normalizeNumber(claim.patientResponsibility)
                    const isPayable = isApprovedClaim(claim) && dueAmount > 0 && !hasPayment

                    return (
                      <TableRow key={claim.claimId} hover>
                        <TableCell>{claim.claimId}</TableCell>
                        <TableCell>{claim.appointmentId ?? '—'}</TableCell>
                        <TableCell>{claim.doctorName ?? 'N/A'}</TableCell>
                        <TableCell sx={{ maxWidth: 190, wordBreak: 'break-word' }}>
                          {claim.policyNumber ?? 'N/A'}
                        </TableCell>
                        <TableCell>{formatMoney(claim.requestedAmount)}</TableCell>
                        <TableCell>{formatMoney(claim.approvedAmount)}</TableCell>
                        <TableCell>{formatMoney(claim.patientResponsibility)}</TableCell>
                        <TableCell>
                          <StatusChip status={claim.status} />
                        </TableCell>
                        <TableCell align="right">
                          {isPayable ? (
                            <Button
                              variant="contained"
                              onClick={() => {
                                openPaymentDialog(claim)
                              }}
                            >
                              Pay
                            </Button>
                          ) : hasPayment ? (
                            <Typography variant="body2" color="text.secondary">
                              Payment already recorded.
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No payment is due for this claim.
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Stack spacing={1.2}>
              {approvedClaims.map((claim) => {
                const hasPayment = paymentClaimIds.has(claim.claimId)
                const dueAmount = normalizeNumber(claim.patientResponsibility)
                const isPayable = isApprovedClaim(claim) && dueAmount > 0 && !hasPayment

                return (
                  <Card key={claim.claimId}>
                    <CardContent>
                      <Stack spacing={0.9}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="h4">Claim #{claim.claimId}</Typography>
                          <StatusChip status={claim.status} />
                        </Stack>

                        <Typography color="text.secondary">Appointment ID: {claim.appointmentId ?? '—'}</Typography>
                        <Typography>Doctor: {claim.doctorName ?? 'N/A'}</Typography>
                        <Typography sx={{ overflowWrap: 'anywhere' }}>
                          Policy Number: {claim.policyNumber ?? 'N/A'}
                        </Typography>
                        <Typography>Requested Amount: {formatMoney(claim.requestedAmount)}</Typography>
                        <Typography>Approved Amount: {formatMoney(claim.approvedAmount)}</Typography>
                        <Typography>Patient Responsibility: {formatMoney(claim.patientResponsibility)}</Typography>

                        {isPayable ? (
                          <Box>
                            <Button
                              variant="contained"
                              fullWidth
                              onClick={() => {
                                openPaymentDialog(claim)
                              }}
                            >
                              Pay
                            </Button>
                          </Box>
                        ) : hasPayment ? (
                          <Alert severity="info">Payment already recorded for this claim.</Alert>
                        ) : (
                          <Alert severity="info">No payment is due for this claim.</Alert>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          )
        ) : null}
      </Stack>

      <Stack spacing={1.2}>
        <Typography variant="h3" component="h2">
          Payment history
        </Typography>

        {showHistoryEmpty ? (
          <EmptyState
            icon={<CreditCardRoundedIcon />}
            title={hasAnyFilter ? 'No payments match filters' : 'No payment history yet'}
            description={
              hasAnyFilter
                ? 'No payment records matched the selected filters.'
                : 'Payment attempts will appear here after you process an eligible claim.'
            }
            actionLabel={hasAnyFilter ? 'Clear Filters' : undefined}
            onAction={
              hasAnyFilter
                ? () => {
                    const next = { status: 'ALL' as const }
                    setDraftFilters(next)
                    setAppliedFilters(next)
                    setPage(0)
                    setSelectedSort(DEFAULT_SORT)
                    setPageSize(DEFAULT_PAGE_SIZE)
                  }
                : undefined
            }
          />
        ) : null}

        {!showHistoryEmpty ? (
          isDesktop ? (
            <TableContainer>
              <Table aria-label="Patient payment history table">
                <TableHead>
                  <TableRow>
                    <TableCell>Payment ID</TableCell>
                    <TableCell>Claim ID</TableCell>
                    <TableCell>Transaction Reference</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Review</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {safePaymentPage.content.map((payment) => (
                    <TableRow key={payment.paymentId} hover>
                      <TableCell>{payment.paymentId}</TableCell>
                      <TableCell>{payment.claimId ?? '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 240, overflowWrap: 'anywhere' }}>
                        {payment.transactionReference ?? 'N/A'}
                      </TableCell>
                      <TableCell>{formatMoney(payment.amount)}</TableCell>
                      <TableCell>
                        <StatusChip status={payment.status} />
                      </TableCell>
                      <TableCell>{formatLocalDateTime(payment.createdAt)}</TableCell>
                      <TableCell>{formatLocalDateTime(payment.updatedAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label={`Review payment ${payment.paymentId}`}
                          onClick={() => {
                            setSelectedPayment(payment)
                          }}
                        >
                          <VisibilityRoundedIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Stack spacing={1.2}>
              {safePaymentPage.content.map((payment) => (
                <Card key={payment.paymentId}>
                  <CardContent>
                    <Stack spacing={0.9}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h4">Payment #{payment.paymentId}</Typography>
                        <StatusChip status={payment.status} />
                      </Stack>

                      <Typography>Claim ID: {payment.claimId ?? '—'}</Typography>
                      <Typography sx={{ overflowWrap: 'anywhere' }}>
                        Transaction Reference: {payment.transactionReference ?? 'N/A'}
                      </Typography>
                      <Typography>Amount: {formatMoney(payment.amount)}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Created: {formatLocalDateTime(payment.createdAt)}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        Updated: {formatLocalDateTime(payment.updatedAt)}
                      </Typography>
                      {payment.status === 'FAILED' ? (
                        <Alert severity="error">{formatFailureReason(payment)}</Alert>
                      ) : payment.status === 'INITIATED' ? (
                        <Alert severity="info">Payment processing has started.</Alert>
                      ) : (
                        <Alert severity="success">Payment completed successfully.</Alert>
                      )}

                      <Box>
                        <Button
                          variant="outlined"
                          startIcon={<VisibilityRoundedIcon />}
                          onClick={() => {
                            setSelectedPayment(payment)
                          }}
                        >
                          Review payment
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )
        ) : null}

        {!showHistoryEmpty ? (
          <TablePagination
            component="div"
            count={safePaymentPage.totalElements}
            page={safePaymentPage.number}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={safePaymentPage.size}
            onRowsPerPageChange={(event) => {
              setPageSize(parseInt(event.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            labelRowsPerPage="Rows per page"
          />
        ) : null}
      </Stack>

      <Dialog
        open={Boolean(selectedClaim)}
        onClose={closePaymentDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="patient-payment-dialog-title"
        aria-describedby="patient-payment-dialog-description"
      >
        <DialogTitle id="patient-payment-dialog-title">
          {selectedClaim ? `Pay claim #${selectedClaim.claimId}` : 'Pay claim'}
        </DialogTitle>

        <DialogContent dividers>
          {isSubmittingPayment ? <LinearProgress aria-label="Processing payment" /> : null}

          {selectedClaim ? (
            <Stack spacing={1.2} id="patient-payment-dialog-description" sx={{ mt: 1 }}>
              <Typography color="text.secondary">
                Deterministic mock payment workflow. No card or bank credentials are collected in this flow.
              </Typography>

              <Typography>Claim ID: {selectedClaim.claimId}</Typography>
              <Typography>Appointment ID: {selectedClaim.appointmentId ?? '—'}</Typography>
              <Typography>Doctor: {selectedClaim.doctorName ?? 'N/A'}</Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>
                Policy Number: {selectedClaim.policyNumber ?? 'N/A'}
              </Typography>
              <Typography>Requested Amount: {formatMoney(selectedClaim.requestedAmount)}</Typography>
              <Typography>Approved Amount: {formatMoney(selectedClaim.approvedAmount)}</Typography>
              <Typography>Patient Responsibility: {formatMoney(selectedClaim.patientResponsibility)}</Typography>

              {paymentAlreadyExists ? (
                <Alert severity="warning">
                  Payment already exists for this claim. Refresh data has disabled duplicate submission.
                </Alert>
              ) : null}

              {!hasPositiveResponsibility(selectedClaim) ? (
                <Alert severity="info">No payment is due for this claim.</Alert>
              ) : null}

              <FormControl fullWidth>
                <InputLabel id="payment-outcome-label">Mock outcome</InputLabel>
                <Select
                  labelId="payment-outcome-label"
                  label="Mock outcome"
                  value={paymentOutcome}
                  onChange={(event) => {
                    setPaymentOutcome(event.target.value as MockPaymentOutcome)
                    if (event.target.value !== 'FAILURE') {
                      setFailureReasonInput('')
                    }
                  }}
                  disabled={isSubmittingPayment || Boolean(paymentResult)}
                >
                  <MenuItem value="SUCCESS">Success</MenuItem>
                  <MenuItem value="FAILURE">Failure</MenuItem>
                </Select>
              </FormControl>

              {paymentOutcome === 'FAILURE' ? (
                <TextField
                  label="Failure reason"
                  value={failureReasonInput}
                  onChange={(event) => setFailureReasonInput(event.target.value)}
                  placeholder="Simulated bank decline"
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                  helperText="Required when outcome is Failure."
                  disabled={isSubmittingPayment || Boolean(paymentResult)}
                />
              ) : null}

              {paymentActionError ? <Alert severity="error">{paymentActionError}</Alert> : null}

              {paymentResult ? (
                <Alert severity={paymentResult.status === 'SUCCESS' ? 'success' : 'error'}>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 700 }}>Payment result</Typography>
                    <Typography>Status: {formatStatusLabel(paymentResult.status)}</Typography>
                    <Typography>Amount: {formatMoney(paymentResult.amount)}</Typography>
                    {paymentResult.transactionReference ? (
                      <Typography sx={{ overflowWrap: 'anywhere' }}>
                        Transaction Reference: {paymentResult.transactionReference}
                      </Typography>
                    ) : null}
                    {paymentResult.status === 'FAILED' ? (
                      <Typography>Failure Reason: {formatFailureReason(paymentResult)}</Typography>
                    ) : null}
                  </Stack>
                </Alert>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={closePaymentDialog} disabled={isSubmittingPayment}>
            {paymentResult ? 'Close' : 'Cancel'}
          </Button>
          {!paymentResult ? (
            <Button
              variant="contained"
              onClick={() => {
                void handleSubmitPayment()
              }}
              disabled={!canSubmit}
            >
              {isSubmittingPayment ? 'Processing...' : 'Confirm payment'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="patient-payment-detail-title"
        aria-describedby="patient-payment-detail-description"
      >
        <DialogTitle id="patient-payment-detail-title">
          {selectedPayment ? `Payment #${selectedPayment.paymentId}` : 'Payment details'}
        </DialogTitle>

        <DialogContent dividers>
          {selectedPayment ? (
            <Stack spacing={1.2} id="patient-payment-detail-description">
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Status
                </Typography>
                <StatusChip status={selectedPayment.status} />
              </Stack>

              <Typography>Payment ID: {selectedPayment.paymentId}</Typography>
              <Typography>Claim ID: {selectedPayment.claimId ?? '—'}</Typography>
              <Typography>Appointment ID: {selectedPayment.appointmentId ?? '—'}</Typography>
              <Typography>Amount: {formatMoney(selectedPayment.amount)}</Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>
                Transaction Reference: {selectedPayment.transactionReference ?? 'N/A'}
              </Typography>
              <Typography>Failure Reason: {formatFailureReason(selectedPayment)}</Typography>
              <Typography color="text.secondary">Created: {formatLocalDateTime(selectedPayment.createdAt)}</Typography>
              <Typography color="text.secondary">Updated: {formatLocalDateTime(selectedPayment.updatedAt)}</Typography>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedPayment(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {snackbar ? (
        <Snackbar
          open
          autoHideDuration={5000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar(null)}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      ) : null}
    </Stack>
  )
}
