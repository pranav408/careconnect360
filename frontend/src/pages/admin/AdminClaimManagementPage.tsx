import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
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
import {
  approveAdminClaim,
  listAdminClaims,
  rejectAdminClaim,
  verifyAdminClaim,
} from '../../api/adminClaimApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { StatusChip } from '../../components/dashboard/StatusChip'
import { formatLocalDateTime, formatStatusLabel } from '../../components/dashboard/dashboardFormatters'
import type {
  AdminClaimQuery,
  AdminClaimResponse,
  AdminClaimSortField,
  AdminClaimsPageResponse,
  ClaimStatus,
  SortDirection,
} from '../../types/claim'

const REJECTION_REASON_MAX_LENGTH = 500
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: `${AdminClaimSortField},${SortDirection}` = 'createdAt,desc'
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface SearchFilters {
  status: ClaimStatus | 'ALL'
  patientEmail: string
  policyNumber: string
  appointmentId: string
}

type ActionType = 'verify' | 'approve' | 'reject'

interface ActiveAction {
  claimId: number
  type: ActionType
}

interface SnackbarState {
  severity: 'success' | 'error'
  message: string
}

interface SortOption {
  value: `${AdminClaimSortField},${SortDirection}`
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
    return 'Not available'
  }

  return usdFormatter.format(value)
}

function formatCalculatedMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return 'Pending calculation'
  }

  return usdFormatter.format(value)
}

function createEmptyPage(): AdminClaimsPageResponse {
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
  sort: `${AdminClaimSortField},${SortDirection}`,
): AdminClaimQuery {
  const query: AdminClaimQuery = {
    page,
    size,
    sort,
  }

  if (filters.status !== 'ALL') {
    query.status = filters.status
  }

  const trimmedPatientEmail = filters.patientEmail.trim()
  if (trimmedPatientEmail) {
    query.patientEmail = trimmedPatientEmail
  }

  const trimmedPolicyNumber = filters.policyNumber.trim()
  if (trimmedPolicyNumber) {
    query.policyNumber = trimmedPolicyNumber
  }

  const trimmedAppointmentId = filters.appointmentId.trim()
  if (trimmedAppointmentId) {
    const parsed = Number(trimmedAppointmentId)
    if (Number.isInteger(parsed) && parsed >= 0) {
      query.appointmentId = parsed
    }
  }

  return query
}

function countByStatus(content: AdminClaimResponse[]): Record<ClaimStatus, number> {
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

function hasAnyFilter(filters: SearchFilters): boolean {
  return (
    filters.status !== 'ALL' ||
    filters.patientEmail.trim().length > 0 ||
    filters.policyNumber.trim().length > 0 ||
    filters.appointmentId.trim().length > 0
  )
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
    return 'Your account is not allowed to access admin claim management.'
  }

  return getApiErrorMessage(error)
}

function toActionErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'You are not authorized to perform this action.'
  }

  if (status === 404) {
    return 'This claim no longer exists. Refreshing the list is recommended.'
  }

  if (status === 409) {
    return getApiErrorMessage(error)
  }

  if (status === 400) {
    return getApiErrorMessage(error)
  }

  if (status && status >= 500) {
    return 'The claim service is temporarily unavailable. Please try again.'
  }

  return getApiErrorMessage(error)
}

function canVerify(claim: AdminClaimResponse): boolean {
  return claim.status === 'SUBMITTED'
}

function canApproveOrReject(claim: AdminClaimResponse): boolean {
  return claim.status === 'VERIFIED'
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

export function AdminClaimManagementPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [draftFilters, setDraftFilters] = useState<SearchFilters>({
    status: 'ALL',
    patientEmail: '',
    policyNumber: '',
    appointmentId: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    status: 'ALL',
    patientEmail: '',
    policyNumber: '',
    appointmentId: '',
  })
  const [selectedSort, setSelectedSort] = useState<`${AdminClaimSortField},${SortDirection}`>(
    DEFAULT_SORT,
  )
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [claimsPage, setClaimsPage] = useState<AdminClaimsPageResponse | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [listErrorTitle, setListErrorTitle] = useState('Unable to load claims')

  const [selectedClaim, setSelectedClaim] = useState<AdminClaimResponse | null>(null)
  const [claimForVerify, setClaimForVerify] = useState<AdminClaimResponse | null>(null)
  const [claimForApprove, setClaimForApprove] = useState<AdminClaimResponse | null>(null)
  const [claimForReject, setClaimForReject] = useState<AdminClaimResponse | null>(null)

  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null)

  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)

  const hasLoadedOnceRef = useRef(false)

  const loadClaims = useCallback(async () => {
    const query = buildQuery(appliedFilters, page, pageSize, selectedSort)

    setListError(null)

    if (hasLoadedOnceRef.current) {
      setIsReloading(true)
    }

    try {
      const response = await listAdminClaims(query)
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
    const summary: string[] = []

    if (appliedFilters.status !== 'ALL') {
      summary.push(`Status: ${formatStatusLabel(appliedFilters.status)}`)
    }
    if (appliedFilters.patientEmail.trim()) {
      summary.push(`Patient email: ${appliedFilters.patientEmail.trim()}`)
    }
    if (appliedFilters.policyNumber.trim()) {
      summary.push(`Policy number: ${appliedFilters.policyNumber.trim()}`)
    }
    if (appliedFilters.appointmentId.trim()) {
      summary.push(`Appointment ID: ${appliedFilters.appointmentId.trim()}`)
    }

    if (summary.length === 0) {
      return 'Showing all claims'
    }

    return summary.join(' | ')
  }, [appliedFilters])

  const showEmpty = !isInitialLoading && !listError && safePage.content.length === 0

  const emptyTitle = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (appliedFilters.status === 'SUBMITTED') {
      return 'No submitted claims'
    }

    if (appliedFilters.status === 'VERIFIED') {
      return 'No verified claims'
    }

    if (
      appliedFilters.patientEmail.trim() ||
      appliedFilters.policyNumber.trim() ||
      appliedFilters.appointmentId.trim()
    ) {
      return 'No search results'
    }

    if (hasAnyFilter(appliedFilters)) {
      return 'No claims match your filters'
    }

    return 'No claims in the system'
  }, [appliedFilters, showEmpty])

  const emptyDescription = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (hasAnyFilter(appliedFilters)) {
      return 'Try adjusting your filters or clear them to view all claims.'
    }

    return 'Claims generated from completed appointments will appear here for admin review.'
  }, [appliedFilters, showEmpty])

  const updateClaimInPage = (updatedClaim: AdminClaimResponse) => {
    setClaimsPage((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        content: current.content.map((item) =>
          item.claimId === updatedClaim.claimId ? { ...item, ...updatedClaim } : item,
        ),
      }
    })

    setSelectedClaim((current) => {
      if (!current || current.claimId !== updatedClaim.claimId) {
        return current
      }

      return { ...current, ...updatedClaim }
    })
  }

  const handleSearch = () => {
    setPage(0)
    setAppliedFilters({ ...draftFilters })
  }

  const handleClearFilters = () => {
    const resetFilters: SearchFilters = {
      status: 'ALL',
      patientEmail: '',
      policyNumber: '',
      appointmentId: '',
    }

    setDraftFilters(resetFilters)
    setAppliedFilters(resetFilters)
    setSelectedSort(DEFAULT_SORT)
    setPage(0)
    setPageSize(DEFAULT_PAGE_SIZE)
  }

  const runVerify = async (claim: AdminClaimResponse) => {
    if (activeAction) {
      return
    }

    setActiveAction({ claimId: claim.claimId, type: 'verify' })

    try {
      const updated = await verifyAdminClaim(claim.claimId)
      updateClaimInPage(updated)
      setClaimForVerify(null)
      setSnackbar({
        severity: 'success',
        message: `Claim ${updated.claimId} was verified successfully.`,
      })
      void loadClaims()
    } catch (error) {
      setSnackbar({
        severity: 'error',
        message: toActionErrorMessage(error),
      })
    } finally {
      setActiveAction(null)
    }
  }

  const runApprove = async (claim: AdminClaimResponse) => {
    if (activeAction) {
      return
    }

    setActiveAction({ claimId: claim.claimId, type: 'approve' })

    try {
      const updated = await approveAdminClaim(claim.claimId)
      updateClaimInPage(updated)
      setClaimForApprove(null)
      setSnackbar({
        severity: 'success',
        message: `Claim ${updated.claimId} was approved successfully.`,
      })
      void loadClaims()
    } catch (error) {
      setSnackbar({
        severity: 'error',
        message: toActionErrorMessage(error),
      })
      if (getApiErrorStatus(error) === 404) {
        void loadClaims()
      }
    } finally {
      setActiveAction(null)
    }
  }

  const runReject = async (claim: AdminClaimResponse) => {
    if (activeAction) {
      return
    }

    const trimmedReason = rejectionReason.trim()
    if (!trimmedReason) {
      setRejectionReasonError('Rejection reason is required.')
      return
    }

    if (trimmedReason.length > REJECTION_REASON_MAX_LENGTH) {
      setRejectionReasonError('Rejection reason cannot exceed 500 characters.')
      return
    }

    setRejectionReasonError(null)
    setActiveAction({ claimId: claim.claimId, type: 'reject' })

    try {
      const updated = await rejectAdminClaim(claim.claimId, {
        reason: trimmedReason,
      })
      updateClaimInPage(updated)
      setClaimForReject(null)
      setRejectionReason('')
      setSnackbar({
        severity: 'success',
        message: `Claim ${updated.claimId} was rejected.`,
      })
      void loadClaims()
    } catch (error) {
      setSnackbar({
        severity: 'error',
        message: toActionErrorMessage(error),
      })
      if (getApiErrorStatus(error) === 404) {
        void loadClaims()
      }
    } finally {
      setActiveAction(null)
    }
  }

  if (isInitialLoading && !claimsPage) {
    return <LoadingSkeleton />
  }

  if (listError && !claimsPage) {
    return (
      <PageError
        title={listErrorTitle}
        message={listError}
        onRetry={() => {
          void loadClaims()
        }}
      />
    )
  }

  return (
    <Stack spacing={2.1}>
      <Stack spacing={0.5}>
        <Typography variant="h2">Claim Management</Typography>
        <Typography color="text.secondary">
          Review workflow: Submitted claims can be verified, then verified claims can be approved or rejected.
        </Typography>
        <Chip label="Admin" color="info" sx={{ width: 'fit-content' }} />
      </Stack>

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

      <Grid container spacing={1.2}>
        <SummaryCard label="Submitted" value={pageCounts.SUBMITTED} />
        <SummaryCard label="Verified" value={pageCounts.VERIFIED} />
        <SummaryCard label="Approved" value={pageCounts.APPROVED} />
        <SummaryCard label="Rejected" value={pageCounts.REJECTED} />
        <SummaryCard label="Paid" value={pageCounts.PAID} />
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Grid container spacing={1.1}>
              <Grid size={{ xs: 12, sm: 6, md: 2.1 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-claim-status-label">Status</InputLabel>
                  <Select
                    labelId="admin-claim-status-label"
                    label="Status"
                    value={draftFilters.status}
                    onChange={(event) => {
                      const statusValue = event.target.value as ClaimStatus | 'ALL'
                      setDraftFilters((current) => ({ ...current, status: statusValue }))
                    }}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    <MenuItem value="SUBMITTED">Submitted</MenuItem>
                    <MenuItem value="VERIFIED">Verified</MenuItem>
                    <MenuItem value="APPROVED">Approved</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                    <MenuItem value="PAID">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.6 }}>
                <TextField
                  label="Patient Email"
                  placeholder="patient@example.com"
                  value={draftFilters.patientEmail}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      patientEmail: event.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.2 }}>
                <TextField
                  label="Policy Number"
                  placeholder="POL-1001"
                  value={draftFilters.policyNumber}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      policyNumber: event.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 1.8 }}>
                <TextField
                  label="Appointment ID"
                  placeholder="101"
                  value={draftFilters.appointmentId}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      appointmentId: event.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 1.9 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-claim-sort-label">Sort</InputLabel>
                  <Select
                    labelId="admin-claim-sort-label"
                    label="Sort"
                    value={selectedSort}
                    onChange={(event) => {
                      const nextSort = event.target.value as `${AdminClaimSortField},${SortDirection}`
                      if (SORT_OPTIONS.some((option) => option.value === nextSort)) {
                        setSelectedSort(nextSort)
                        setPage(0)
                      }
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

              <Grid size={{ xs: 12, sm: 6, md: 1.4 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-claim-size-label">Page Size</InputLabel>
                  <Select
                    labelId="admin-claim-size-label"
                    label="Page Size"
                    value={String(pageSize)}
                    onChange={(event) => {
                      const parsed = Number(event.target.value)
                      if (PAGE_SIZE_OPTIONS.includes(parsed)) {
                        setPageSize(parsed)
                        setPage(0)
                      }
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
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1}>
              <Button
                variant="contained"
                startIcon={<SearchRoundedIcon />}
                onClick={handleSearch}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Search
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FilterAltOffRoundedIcon />}
                onClick={handleClearFilters}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Clear Filters
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {appliedSummary}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {showEmpty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={hasAnyFilter(appliedFilters) ? 'Clear Filters' : undefined}
          onAction={hasAnyFilter(appliedFilters) ? handleClearFilters : undefined}
        />
      ) : null}

      {!showEmpty ? (
        <>
          {isDesktop ? (
            <TableContainer>
              <Table aria-label="Admin claim list">
                <TableHead>
                  <TableRow>
                    <TableCell>Claim ID</TableCell>
                    <TableCell>Appointment ID</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Policy Number</TableCell>
                    <TableCell>Requested Amount</TableCell>
                    <TableCell>Approved Amount</TableCell>
                    <TableCell>Patient Responsibility</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Rejection Reason</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {safePage.content.map((claim) => {
                    const rowBusy = activeAction?.claimId === claim.claimId
                    return (
                      <TableRow key={claim.claimId} hover>
                        <TableCell>{claim.claimId}</TableCell>
                        <TableCell>{claim.appointmentId ?? 'Not available'}</TableCell>
                        <TableCell>{claim.patientName ?? 'Not available'}</TableCell>
                        <TableCell>{claim.doctorName ?? 'Not available'}</TableCell>
                        <TableCell sx={{ maxWidth: 220, wordBreak: 'break-all' }}>
                          {claim.policyNumber ?? 'Not available'}
                        </TableCell>
                        <TableCell>{formatMoney(claim.requestedAmount)}</TableCell>
                        <TableCell>{formatCalculatedMoney(claim.approvedAmount)}</TableCell>
                        <TableCell>{formatCalculatedMoney(claim.patientResponsibility)}</TableCell>
                        <TableCell>
                          <StatusChip status={claim.status} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>
                          {claim.rejectionReason ?? 'Not provided'}
                        </TableCell>
                        <TableCell>{formatLocalDateTime(claim.createdAt)}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setSelectedClaim(claim)}
                              aria-label={`Review claim ${claim.claimId}`}
                            >
                              Review
                            </Button>

                            {canVerify(claim) ? (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={rowBusy}
                                onClick={() => setClaimForVerify(claim)}
                              >
                                {rowBusy && activeAction?.type === 'verify' ? 'Verifying...' : 'Verify'}
                              </Button>
                            ) : null}

                            {canApproveOrReject(claim) ? (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={rowBusy}
                                  onClick={() => setClaimForApprove(claim)}
                                >
                                  {rowBusy && activeAction?.type === 'approve' ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  disabled={rowBusy}
                                  onClick={() => {
                                    setClaimForReject(claim)
                                    setRejectionReason('')
                                    setRejectionReasonError(null)
                                  }}
                                >
                                  {rowBusy && activeAction?.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
                            ) : null}

                            {!canVerify(claim) && !canApproveOrReject(claim) ? (
                              <Typography variant="body2" color="text.secondary">
                                No actions
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Grid container spacing={1.2}>
              {safePage.content.map((claim) => {
                const rowBusy = activeAction?.claimId === claim.claimId
                return (
                  <Grid key={claim.claimId} size={{ xs: 12, sm: 6 }}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack spacing={1}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h4" sx={{ fontSize: '1.02rem' }}>
                              Claim #{claim.claimId}
                            </Typography>
                            <StatusChip status={claim.status} />
                          </Stack>

                          <Typography variant="body2">Appointment ID: {claim.appointmentId ?? 'Not available'}</Typography>
                          <Typography variant="body2">Patient: {claim.patientName ?? 'Not available'}</Typography>
                          <Typography variant="body2">Doctor: {claim.doctorName ?? 'Not available'}</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            Policy Number: {claim.policyNumber ?? 'Not available'}
                          </Typography>
                          <Typography variant="body2">Requested Amount: {formatMoney(claim.requestedAmount)}</Typography>
                          <Typography variant="body2">
                            Approved Amount: {formatCalculatedMoney(claim.approvedAmount)}
                          </Typography>
                          <Typography variant="body2">
                            Patient Responsibility: {formatCalculatedMoney(claim.patientResponsibility)}
                          </Typography>
                          <Typography variant="body2">Created: {formatLocalDateTime(claim.createdAt)}</Typography>
                          {claim.rejectionReason ? (
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              Rejection Reason: {claim.rejectionReason}
                            </Typography>
                          ) : null}

                          <Stack spacing={0.8} sx={{ pt: 0.5 }}>
                            <Button
                              variant="outlined"
                              onClick={() => setSelectedClaim(claim)}
                              aria-label={`Review claim ${claim.claimId}`}
                            >
                              Review
                            </Button>

                            {canVerify(claim) ? (
                              <Button
                                variant="contained"
                                disabled={rowBusy}
                                onClick={() => setClaimForVerify(claim)}
                              >
                                {rowBusy && activeAction?.type === 'verify' ? 'Verifying...' : 'Verify'}
                              </Button>
                            ) : null}

                            {canApproveOrReject(claim) ? (
                              <>
                                <Button
                                  variant="contained"
                                  disabled={rowBusy}
                                  onClick={() => setClaimForApprove(claim)}
                                >
                                  {rowBusy && activeAction?.type === 'approve' ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  color="error"
                                  variant="outlined"
                                  disabled={rowBusy}
                                  onClick={() => {
                                    setClaimForReject(claim)
                                    setRejectionReason('')
                                    setRejectionReasonError(null)
                                  }}
                                >
                                  {rowBusy && activeAction?.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
                            ) : null}

                            {!canVerify(claim) && !canApproveOrReject(claim) ? (
                              <Typography variant="body2" color="text.secondary">
                                No actions
                              </Typography>
                            ) : null}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}

          <Stack sx={{ alignItems: 'center' }}>
            <TablePagination
              component="div"
              count={safePage.totalElements}
              page={safePage.number}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(event) => {
                const parsed = Number(event.target.value)
                if (PAGE_SIZE_OPTIONS.includes(parsed)) {
                  setPageSize(parsed)
                  setPage(0)
                }
              }}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            />
          </Stack>
        </>
      ) : null}

      <Dialog open={Boolean(selectedClaim)} onClose={() => setSelectedClaim(null)} fullWidth maxWidth="sm">
        <DialogTitle>Claim Review</DialogTitle>
        <DialogContent>
          {selectedClaim ? (
            <Stack spacing={1.1}>
              <Typography>Claim ID: {selectedClaim.claimId}</Typography>
              <Typography>Appointment ID: {selectedClaim.appointmentId ?? 'Not available'}</Typography>
              <Typography>Patient: {selectedClaim.patientName ?? 'Not available'}</Typography>
              <Typography>Doctor: {selectedClaim.doctorName ?? 'Not available'}</Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: {selectedClaim.policyNumber ?? 'Not available'}
              </Typography>
              <Typography>Requested Amount: {formatMoney(selectedClaim.requestedAmount)}</Typography>
              <Typography>Approved Amount: {formatCalculatedMoney(selectedClaim.approvedAmount)}</Typography>
              <Typography>
                Patient Responsibility: {formatCalculatedMoney(selectedClaim.patientResponsibility)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography>Status:</Typography>
                <StatusChip status={selectedClaim.status} />
              </Stack>
              {selectedClaim.rejectionReason ? (
                <Typography sx={{ wordBreak: 'break-word' }}>
                  Rejection Reason: {selectedClaim.rejectionReason}
                </Typography>
              ) : null}
              <Typography>Created: {formatLocalDateTime(selectedClaim.createdAt)}</Typography>
              <Typography>Updated: {formatLocalDateTime(selectedClaim.updatedAt)}</Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedClaim(null)} startIcon={<CloseRoundedIcon />}>
            Close
          </Button>

          {selectedClaim && canVerify(selectedClaim) ? (
            <Button
              onClick={() => setClaimForVerify(selectedClaim)}
              variant="contained"
              disabled={activeAction?.claimId === selectedClaim.claimId}
            >
              Verify
            </Button>
          ) : null}

          {selectedClaim && canApproveOrReject(selectedClaim) ? (
            <>
              <Button
                onClick={() => {
                  setClaimForReject(selectedClaim)
                  setRejectionReason('')
                  setRejectionReasonError(null)
                }}
                color="error"
                variant="outlined"
                disabled={activeAction?.claimId === selectedClaim.claimId}
              >
                Reject
              </Button>
              <Button
                onClick={() => setClaimForApprove(selectedClaim)}
                variant="contained"
                disabled={activeAction?.claimId === selectedClaim.claimId}
              >
                Approve
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(claimForVerify)}
        onClose={() => {
          if (!activeAction) {
            setClaimForVerify(null)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Verify claim?</DialogTitle>
        <DialogContent>
          {claimForVerify ? (
            <Stack spacing={1}>
              <Typography>Claim ID: {claimForVerify.claimId}</Typography>
              <Typography>Patient: {claimForVerify.patientName ?? 'Not available'}</Typography>
              <Typography>Appointment ID: {claimForVerify.appointmentId ?? 'Not available'}</Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: {claimForVerify.policyNumber ?? 'Not available'}
              </Typography>
              <Typography>Requested Amount: {formatMoney(claimForVerify.requestedAmount)}</Typography>
              <Typography>
                Verification moves the claim to VERIFIED so it can be approved or rejected.
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimForVerify(null)} disabled={Boolean(activeAction)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (claimForVerify) {
                void runVerify(claimForVerify)
              }
            }}
            disabled={Boolean(activeAction)}
          >
            {activeAction?.type === 'verify' ? 'Verifying...' : 'Confirm Verify'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(claimForApprove)}
        onClose={() => {
          if (!activeAction) {
            setClaimForApprove(null)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Approve claim?</DialogTitle>
        <DialogContent>
          {claimForApprove ? (
            <Stack spacing={1}>
              <Typography>Claim ID: {claimForApprove.claimId}</Typography>
              <Typography>Patient: {claimForApprove.patientName ?? 'Not available'}</Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: {claimForApprove.policyNumber ?? 'Not available'}
              </Typography>
              <Typography>Requested Amount: {formatMoney(claimForApprove.requestedAmount)}</Typography>
              <Typography>
                Approval uses backend calculations for approved amount and patient responsibility.
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimForApprove(null)} disabled={Boolean(activeAction)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (claimForApprove) {
                void runApprove(claimForApprove)
              }
            }}
            disabled={Boolean(activeAction)}
          >
            {activeAction?.type === 'approve' ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(claimForReject)}
        onClose={() => {
          if (!activeAction) {
            setClaimForReject(null)
            setRejectionReason('')
            setRejectionReasonError(null)
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject claim?</DialogTitle>
        <DialogContent>
          {claimForReject ? (
            <Stack spacing={1.1}>
              <Typography>Claim ID: {claimForReject.claimId}</Typography>
              <Typography>Patient: {claimForReject.patientName ?? 'Not available'}</Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: {claimForReject.policyNumber ?? 'Not available'}
              </Typography>

              <TextField
                label="Rejection reason"
                value={rejectionReason}
                required
                slotProps={{ htmlInput: { maxLength: REJECTION_REASON_MAX_LENGTH } }}
                onChange={(event) => {
                  setRejectionReason(event.target.value)
                  if (rejectionReasonError) {
                    setRejectionReasonError(null)
                  }
                }}
                error={Boolean(rejectionReasonError)}
                helperText={
                  rejectionReasonError ??
                  `${rejectionReason.length}/${REJECTION_REASON_MAX_LENGTH} characters`
                }
                aria-describedby="reject-claim-reason-helper"
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setClaimForReject(null)
              setRejectionReason('')
              setRejectionReasonError(null)
            }}
            disabled={Boolean(activeAction)}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (claimForReject) {
                void runReject(claimForReject)
              }
            }}
            disabled={Boolean(activeAction)}
          >
            {activeAction?.type === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snackbar ? (
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar(null)}
            sx={{ width: '100%' }}
            action={
              snackbar.severity === 'error' ? (
                <Button color="inherit" size="small" onClick={() => void loadClaims()}>
                  Refresh
                </Button>
              ) : undefined
            }
          >
            {snackbar.message}
          </Alert>
        ) : (
          <Box />
        )}
      </Snackbar>
    </Stack>
  )
}
