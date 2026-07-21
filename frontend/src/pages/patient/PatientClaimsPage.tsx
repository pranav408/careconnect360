import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { getMyClaimById, listMyClaims } from '../../api/patientClaimApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { StatusChip } from '../../components/dashboard/StatusChip'
import { formatLocalDateTime, formatStatusLabel } from '../../components/dashboard/dashboardFormatters'
import type {
  ClaimStatus,
  PatientClaimQuery,
  PatientClaimResponse,
  PatientClaimSortField,
  PatientClaimsPageResponse,
  SortDirection,
} from '../../types/claim'

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: `${PatientClaimSortField},${SortDirection}` = 'createdAt,desc'
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type ClaimStatusFilter = ClaimStatus | 'ALL'

interface SearchFilters {
  status: ClaimStatusFilter
}

interface SortOption {
  value: `${PatientClaimSortField},${SortDirection}`
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'claimId,asc', label: 'Claim ID ascending' },
  { value: 'claimId,desc', label: 'Claim ID descending' },
  { value: 'status,asc', label: 'Status A-Z' },
  { value: 'requestedAmount,desc', label: 'Requested amount highest' },
  { value: 'approvedAmount,desc', label: 'Approved amount highest' },
  { value: 'patientResponsibility,desc', label: 'Patient responsibility highest' },
]

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return usdFormatter.format(value)
}

function formatDecisionMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return 'Pending calculation'
  }

  return usdFormatter.format(value)
}

function createEmptyPage(): PatientClaimsPageResponse {
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

function buildQuery(
  filters: SearchFilters,
  page: number,
  size: number,
  sort: `${PatientClaimSortField},${SortDirection}`,
): PatientClaimQuery {
  const query: PatientClaimQuery = {
    page,
    size,
    sort,
  }

  if (filters.status !== 'ALL') {
    query.status = filters.status
  }

  return query
}

function countByStatus(content: PatientClaimResponse[]): Record<ClaimStatus, number> {
  const counts: Record<ClaimStatus, number> = {
    SUBMITTED: 0,
    VERIFIED: 0,
    APPROVED: 0,
    REJECTED: 0,
    PAID: 0,
  }

  for (const claim of content) {
    counts[claim.status] += 1
  }

  return counts
}

function toListErrorTitle(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted'
  }

  if (status === 400) {
    return 'Invalid claim query'
  }

  if (status && status >= 500) {
    return 'Claim service unavailable'
  }

  return 'Unable to load claims'
}

function toListErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Your account is not allowed to access patient claims.'
  }

  return getApiErrorMessage(error)
}

function toDetailErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 404) {
    return 'This claim could not be found. It may no longer be available.'
  }

  if (status === 403) {
    return 'You are not allowed to view this claim.'
  }

  if (status && status >= 500) {
    return 'Claim details are temporarily unavailable. Please try again.'
  }

  return getApiErrorMessage(error)
}

function statusDescription(status: ClaimStatus): string {
  if (status === 'SUBMITTED') {
    return 'This claim was automatically created after an eligible completed appointment and is awaiting administrative verification.'
  }

  if (status === 'VERIFIED') {
    return 'This claim was reviewed and is awaiting an approval or rejection decision.'
  }

  if (status === 'APPROVED') {
    return 'This claim was approved. Approved amount and patient responsibility are provided by the backend.'
  }

  if (status === 'REJECTED') {
    return 'This claim was rejected. A rejection reason may be available when provided by the backend.'
  }

  return 'Patient payment workflow for this claim was completed.'
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Grid size={{ xs: 6, md: 2.4 }}>
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

function LoadingSkeleton() {
  return (
    <Stack spacing={2} aria-label="Loading claims">
      <Skeleton variant="text" width="34%" height={48} />
      <Grid container spacing={1.2}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Grid key={index} size={{ xs: 6, md: 2.4 }}>
            <Skeleton variant="rounded" height={96} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={88} />
      <Skeleton variant="rounded" height={280} />
    </Stack>
  )
}

export function PatientClaimsPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))

  const [draftFilters, setDraftFilters] = useState<SearchFilters>({
    status: 'ALL',
  })
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    status: 'ALL',
  })
  const [selectedSort, setSelectedSort] = useState<`${PatientClaimSortField},${SortDirection}`>(
    DEFAULT_SORT,
  )
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [claimsPage, setClaimsPage] = useState<PatientClaimsPageResponse | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [listErrorTitle, setListErrorTitle] = useState('Unable to load claims')

  const [selectedClaim, setSelectedClaim] = useState<PatientClaimResponse | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const hasLoadedOnceRef = useRef(false)

  const loadClaims = useCallback(async () => {
    const query = buildQuery(appliedFilters, page, pageSize, selectedSort)

    setListError(null)

    if (hasLoadedOnceRef.current) {
      setIsReloading(true)
    }

    try {
      const response = await listMyClaims(query)
      setClaimsPage(response)
    } catch (error) {
      setListErrorTitle(toListErrorTitle(error))
      setListError(toListErrorMessage(error))
    } finally {
      hasLoadedOnceRef.current = true
      setIsInitialLoading(false)
      setIsReloading(false)
    }
  }, [appliedFilters, page, pageSize, selectedSort])

  useEffect(() => {
    queueMicrotask(() => {
      void loadClaims()
    })
  }, [loadClaims])

  const safePage = claimsPage ?? createEmptyPage()

  const pageCounts = useMemo(() => countByStatus(safePage.content), [safePage.content])

  const appliedSummary = useMemo(() => {
    if (appliedFilters.status === 'ALL') {
      return 'Showing all claim statuses'
    }

    return `Status: ${formatStatusLabel(appliedFilters.status)}`
  }, [appliedFilters.status])

  const showEmpty = !isInitialLoading && !listError && safePage.content.length === 0

  const emptyTitle = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (appliedFilters.status === 'APPROVED') {
      return 'No approved claims'
    }

    if (appliedFilters.status === 'REJECTED') {
      return 'No rejected claims'
    }

    if (appliedFilters.status !== 'ALL') {
      return `No ${formatStatusLabel(appliedFilters.status).toLowerCase()} claims`
    }

    return 'No claims yet'
  }, [appliedFilters.status, showEmpty])

  const emptyDescription = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (appliedFilters.status !== 'ALL') {
      return 'No claims match the selected filters. Claims are created automatically after eligible completed appointments.'
    }

    return 'Claims are created automatically after eligible completed appointments. Once available, they will appear here.'
  }, [appliedFilters.status, showEmpty])

  const loadClaimDetail = useCallback(async (claim: PatientClaimResponse) => {
    setSelectedClaim(claim)
    setDetailError(null)
    setIsDetailLoading(true)

    try {
      const response = await getMyClaimById(claim.claimId)
      setSelectedClaim(response)
    } catch (error) {
      setDetailError(toDetailErrorMessage(error))
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  if (isInitialLoading && !claimsPage) {
    return <LoadingSkeleton />
  }

  if (listError && !claimsPage) {
    return <PageError title={listErrorTitle} message={listError} onRetry={() => void loadClaims()} />
  }

  return (
    <Stack spacing={2.2} aria-busy={isReloading}>
      <Stack spacing={0.6}>
        <Typography variant="h2">Claims</Typography>
        <Typography color="text.secondary">
          Review claim progress and financial outcomes for your completed appointments.
        </Typography>
        <Chip label="Patient" color="secondary" sx={{ width: 'fit-content' }} />
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={1.1}>
            <Typography variant="h3">Claim lifecycle</Typography>
            <Typography color="text.secondary">
              Submitted: Created automatically after an eligible completed appointment and waiting for administrative verification.
            </Typography>
            <Typography color="text.secondary">
              Verified: Reviewed and waiting for approval or rejection.
            </Typography>
            <Typography color="text.secondary">
              Approved: Approved amount and patient responsibility are available when provided by the backend.
            </Typography>
            <Typography color="text.secondary">
              Rejected: A rejection reason may be shown when one was returned.
            </Typography>
            <Typography color="text.secondary">Paid: Patient payment workflow was completed.</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.2}>
        <SummaryCard label="Submitted" value={pageCounts.SUBMITTED} />
        <SummaryCard label="Verified" value={pageCounts.VERIFIED} />
        <SummaryCard label="Approved" value={pageCounts.APPROVED} />
        <SummaryCard label="Rejected" value={pageCounts.REJECTED} />
        <SummaryCard label="Paid" value={pageCounts.PAID} />
      </Grid>

      <Card>
        <CardContent>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="claims-status-filter-label">Status</InputLabel>
                <Select
                  labelId="claims-status-filter-label"
                  label="Status"
                  value={draftFilters.status}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      status: event.target.value as ClaimStatusFilter,
                    }))
                  }
                >
                  <MenuItem value="ALL">All statuses</MenuItem>
                  <MenuItem value="SUBMITTED">Submitted</MenuItem>
                  <MenuItem value="VERIFIED">Verified</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="PAID">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="claims-sort-label">Sort</InputLabel>
                <Select
                  labelId="claims-sort-label"
                  label="Sort"
                  value={selectedSort}
                  onChange={(event) => {
                    setSelectedSort(event.target.value as `${PatientClaimSortField},${SortDirection}`)
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
                <InputLabel id="claims-page-size-label">Page Size</InputLabel>
                <Select
                  labelId="claims-page-size-label"
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

      {isReloading ? <LinearProgress aria-label="Refreshing claims" /> : null}

      {listError && claimsPage ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadClaims()}>
              Retry
            </Button>
          }
        >
          {listError}
        </Alert>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={<ReceiptLongRoundedIcon />}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={appliedFilters.status !== 'ALL' ? 'Clear Filters' : undefined}
          onAction={
            appliedFilters.status !== 'ALL'
              ? () => {
                  const next = { status: 'ALL' as const }
                  setDraftFilters(next)
                  setAppliedFilters(next)
                  setPage(0)
                }
              : undefined
          }
        />
      ) : null}

      {!showEmpty ? (
        isDesktop ? (
          <TableContainer>
            <Table aria-label="Patient claims table">
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
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">Review</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {safePage.content.map((claim) => (
                  <TableRow key={claim.claimId} hover>
                    <TableCell>{claim.claimId}</TableCell>
                    <TableCell>{claim.appointmentId ?? '—'}</TableCell>
                    <TableCell>{claim.doctorName ?? 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 180, wordBreak: 'break-word' }}>
                      {claim.policyNumber ?? 'N/A'}
                    </TableCell>
                    <TableCell>{formatMoney(claim.requestedAmount)}</TableCell>
                    <TableCell>{formatDecisionMoney(claim.approvedAmount)}</TableCell>
                    <TableCell>{formatDecisionMoney(claim.patientResponsibility)}</TableCell>
                    <TableCell>
                      <StatusChip status={claim.status} />
                    </TableCell>
                    <TableCell>{formatLocalDateTime(claim.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label={`Review claim ${claim.claimId}`}
                        onClick={() => {
                          void loadClaimDetail(claim)
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
            {safePage.content.map((claim) => (
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
                    <Typography>Approved Amount: {formatDecisionMoney(claim.approvedAmount)}</Typography>
                    <Typography>
                      Patient Responsibility: {formatDecisionMoney(claim.patientResponsibility)}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Created: {formatLocalDateTime(claim.createdAt)}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {statusDescription(claim.status)}
                    </Typography>

                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityRoundedIcon />}
                        onClick={() => {
                          void loadClaimDetail(claim)
                        }}
                      >
                        Review
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )
      ) : null}

      {!showEmpty ? (
        <TablePagination
          component="div"
          count={safePage.totalElements}
          page={safePage.number}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={safePage.size}
          onRowsPerPageChange={(event) => {
            setPageSize(parseInt(event.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          labelRowsPerPage="Rows per page"
        />
      ) : null}

      <Dialog
        open={Boolean(selectedClaim)}
        onClose={() => {
          if (!isDetailLoading) {
            setSelectedClaim(null)
            setDetailError(null)
          }
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="patient-claim-review-title"
        aria-describedby="patient-claim-review-description"
      >
        <DialogTitle id="patient-claim-review-title">
          {selectedClaim ? `Claim #${selectedClaim.claimId}` : 'Claim review'}
        </DialogTitle>
        <DialogContent dividers>
          {isDetailLoading ? <LinearProgress aria-label="Loading claim details" /> : null}

          {detailError ? (
            <Alert severity="error" sx={{ mb: 1.2 }}>
              {detailError}
            </Alert>
          ) : null}

          {selectedClaim ? (
            <Stack spacing={1.2} id="patient-claim-review-description">
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Status
                </Typography>
                <StatusChip status={selectedClaim.status} />
              </Stack>

              <Typography color="text.secondary">{statusDescription(selectedClaim.status)}</Typography>

              <Typography>Appointment ID: {selectedClaim.appointmentId ?? '—'}</Typography>
              <Typography>Doctor: {selectedClaim.doctorName ?? 'N/A'}</Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>
                Policy Number: {selectedClaim.policyNumber ?? 'N/A'}
              </Typography>
              <Typography>Requested Amount: {formatMoney(selectedClaim.requestedAmount)}</Typography>
              <Typography>Approved Amount: {formatDecisionMoney(selectedClaim.approvedAmount)}</Typography>
              <Typography>
                Patient Responsibility: {formatDecisionMoney(selectedClaim.patientResponsibility)}
              </Typography>

              {selectedClaim.status === 'REJECTED' ? (
                <Typography>
                  Rejection Reason: {selectedClaim.rejectionReason?.trim() || 'No rejection reason was provided.'}
                </Typography>
              ) : null}

              <Typography color="text.secondary">Created: {formatLocalDateTime(selectedClaim.createdAt)}</Typography>
              <Typography color="text.secondary">Updated: {formatLocalDateTime(selectedClaim.updatedAt)}</Typography>

              <Button
                variant="contained"
                onClick={() => {
                  setSelectedClaim(null)
                  setDetailError(null)
                }}
              >
                Close
              </Button>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  )
}
