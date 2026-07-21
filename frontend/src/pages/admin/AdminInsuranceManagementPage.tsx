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
  TableRow,
  TablePagination,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  activateAdminInsurancePolicy,
  listAdminInsurancePolicies,
  rejectAdminInsurancePolicy,
} from '../../api/adminInsuranceApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { StatusChip } from '../../components/dashboard/StatusChip'
import { formatLocalDate, formatStatusLabel, formatUsd } from '../../components/dashboard/dashboardFormatters'
import type {
  AdminInsurancePoliciesResponse,
  AdminInsurancePolicyQuery,
  AdminInsurancePolicyResponse,
  AdminInsurancePolicySortField,
  PolicyStatus,
  SortDirection,
} from '../../types/insurance'

const REJECTION_REASON_MAX_LENGTH = 255

interface SearchFilters {
  status: PolicyStatus | 'ALL'
  patientEmail: string
  policyNumber: string
}

type ActionType = 'activate' | 'reject'

interface ActiveAction {
  policyId: number
  type: ActionType
}

interface SortOption {
  value: `${AdminInsurancePolicySortField},${SortDirection}`
  label: string
}

interface SnackbarState {
  severity: 'success' | 'error'
  message: string
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: `${AdminInsurancePolicySortField},${SortDirection}` = 'createdAt,desc'

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'policyNumber,asc', label: 'Policy number A-Z' },
  { value: 'providerName,asc', label: 'Provider A-Z' },
  { value: 'startDate,desc', label: 'Start date newest' },
  { value: 'status,asc', label: 'Status A-Z' },
  { value: 'coveragePercentage,desc', label: 'Coverage highest' },
  { value: 'deductibleAmount,desc', label: 'Deductible highest' },
]

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function isPendingPolicy(policy: AdminInsurancePolicyResponse): boolean {
  return policy.status === 'PENDING'
}

function formatCoverage(value: number): string {
  return `${value.toFixed(2)}%`
}

function createEmptyPage(): AdminInsurancePoliciesResponse {
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
  sort: `${AdminInsurancePolicySortField},${SortDirection}`,
): AdminInsurancePolicyQuery {
  const query: AdminInsurancePolicyQuery = {
    page,
    size,
    sort,
  }

  if (filters.status !== 'ALL') {
    query.status = filters.status
  }

  const trimmedEmail = filters.patientEmail.trim()
  if (trimmedEmail) {
    query.patientEmail = trimmedEmail
  }

  const trimmedPolicyNumber = filters.policyNumber.trim()
  if (trimmedPolicyNumber) {
    query.policyNumber = trimmedPolicyNumber
  }

  return query
}

function countByStatus(content: AdminInsurancePolicyResponse[]): Record<PolicyStatus, number> {
  const counts: Record<PolicyStatus, number> = {
    PENDING: 0,
    ACTIVE: 0,
    REJECTED: 0,
    EXPIRED: 0,
  }

  for (const policy of content) {
    counts[policy.status] += 1
  }

  return counts
}

function hasAnyFilter(filters: SearchFilters): boolean {
  return (
    filters.status !== 'ALL' ||
    filters.patientEmail.trim().length > 0 ||
    filters.policyNumber.trim().length > 0
  )
}

function toListErrorTitle(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted'
  }

  if (status === 400) {
    return 'Invalid insurance query'
  }

  if (status && status >= 500) {
    return 'Insurance service unavailable'
  }

  return 'Unable to load insurance policies'
}

function toListErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Your account is not allowed to access admin insurance management.'
  }

  return getApiErrorMessage(error)
}

function toActionErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'You are not authorized to perform this action.'
  }

  if (status === 404) {
    return 'This insurance policy no longer exists. Refreshing the list is recommended.'
  }

  if (status === 409) {
    return getApiErrorMessage(error)
  }

  if (status === 400) {
    return getApiErrorMessage(error)
  }

  if (status && status >= 500) {
    return 'The insurance service is temporarily unavailable. Please try again.'
  }

  return getApiErrorMessage(error)
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
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
    <Stack spacing={2} aria-label="Loading insurance policies">
      <Skeleton variant="text" width="34%" height={48} />
      <Grid container spacing={1.2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid key={index} size={{ xs: 6, md: 3 }}>
            <Skeleton variant="rounded" height={96} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={88} />
      <Skeleton variant="rounded" height={280} />
    </Stack>
  )
}

export function AdminInsuranceManagementPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [draftFilters, setDraftFilters] = useState<SearchFilters>({
    status: 'ALL',
    patientEmail: '',
    policyNumber: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    status: 'ALL',
    patientEmail: '',
    policyNumber: '',
  })
  const [selectedSort, setSelectedSort] = useState<`${AdminInsurancePolicySortField},${SortDirection}`>(
    DEFAULT_SORT,
  )
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [policiesPage, setPoliciesPage] = useState<AdminInsurancePoliciesResponse | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [listErrorTitle, setListErrorTitle] = useState('Unable to load insurance policies')

  const [selectedPolicy, setSelectedPolicy] = useState<AdminInsurancePolicyResponse | null>(null)
  const [policyForActivation, setPolicyForActivation] = useState<AdminInsurancePolicyResponse | null>(null)
  const [policyForRejection, setPolicyForRejection] = useState<AdminInsurancePolicyResponse | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null)

  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const loadPolicies = useCallback(async () => {
    const query = buildQuery(appliedFilters, page, pageSize, selectedSort)

    setListError(null)

    if (hasLoadedOnceRef.current) {
      setIsReloading(true)
    }

    try {
      const response = await listAdminInsurancePolicies(query)
      setPoliciesPage(response)
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
      void loadPolicies()
    })
  }, [loadPolicies])

  const safePage = policiesPage ?? createEmptyPage()
  const pageCounts = useMemo(() => countByStatus(safePage.content), [safePage.content])

  const patientColumnsVisible = useMemo(
    () => safePage.content.some((policy) => Boolean(policy.patientEmail || policy.patientName || policy.patientId)),
    [safePage.content],
  )

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

    if (summary.length === 0) {
      return 'Showing all insurance policies'
    }

    return summary.join(' | ')
  }, [appliedFilters])

  const showEmpty = !isInitialLoading && !listError && safePage.content.length === 0

  const emptyTitle = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (appliedFilters.status === 'PENDING') {
      return 'No pending policies'
    }

    if (appliedFilters.patientEmail.trim() || appliedFilters.policyNumber.trim()) {
      return 'No search results'
    }

    if (hasAnyFilter(appliedFilters)) {
      return 'No policies match your filters'
    }

    return 'No insurance policies in the system'
  }, [appliedFilters, showEmpty])

  const emptyDescription = useMemo(() => {
    if (!showEmpty) {
      return ''
    }

    if (hasAnyFilter(appliedFilters)) {
      return 'Try adjusting your filters or clear them to view all policies.'
    }

    return 'Insurance policies submitted by patients will appear here for admin review.'
  }, [appliedFilters, showEmpty])

  const updatePolicyInPage = (updatedPolicy: AdminInsurancePolicyResponse) => {
    setPoliciesPage((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        content: current.content.map((item) =>
          item.policyId === updatedPolicy.policyId ? { ...item, ...updatedPolicy } : item,
        ),
      }
    })

    setSelectedPolicy((current) => {
      if (!current || current.policyId !== updatedPolicy.policyId) {
        return current
      }

      return { ...current, ...updatedPolicy }
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
    }

    setDraftFilters(resetFilters)
    setAppliedFilters(resetFilters)
    setSelectedSort(DEFAULT_SORT)
    setPage(0)
    setPageSize(DEFAULT_PAGE_SIZE)
  }

  const runActivate = async (policy: AdminInsurancePolicyResponse) => {
    if (activeAction) {
      return
    }

    setActiveAction({ policyId: policy.policyId, type: 'activate' })

    try {
      const updated = await activateAdminInsurancePolicy(policy.policyId)
      updatePolicyInPage(updated)
      setPolicyForActivation(null)
      setSnackbar({
        severity: 'success',
        message: `Policy ${updated.policyNumber} is now ACTIVE.`,
      })
      void loadPolicies()
    } catch (error) {
      setSnackbar({
        severity: 'error',
        message: toActionErrorMessage(error),
      })
    } finally {
      setActiveAction(null)
    }
  }

  const runReject = async (policy: AdminInsurancePolicyResponse) => {
    if (activeAction) {
      return
    }

    const trimmedReason = rejectionReason.trim()
    if (!trimmedReason) {
      setRejectionReasonError('Rejection reason is required.')
      return
    }

    if (trimmedReason.length > REJECTION_REASON_MAX_LENGTH) {
      setRejectionReasonError('Rejection reason cannot exceed 255 characters.')
      return
    }

    setRejectionReasonError(null)
    setActiveAction({ policyId: policy.policyId, type: 'reject' })

    try {
      const updated = await rejectAdminInsurancePolicy(policy.policyId, {
        reason: trimmedReason,
      })
      updatePolicyInPage(updated)
      setPolicyForRejection(null)
      setRejectionReason('')
      setSnackbar({
        severity: 'success',
        message: `Policy ${updated.policyNumber} was rejected.`,
      })
      void loadPolicies()
    } catch (error) {
      setSnackbar({
        severity: 'error',
        message: toActionErrorMessage(error),
      })
    } finally {
      setActiveAction(null)
    }
  }

  if (isInitialLoading && !policiesPage) {
    return <LoadingSkeleton />
  }

  if (listError && !policiesPage) {
    return (
      <PageError
        title={listErrorTitle}
        message={listError}
        onRetry={() => {
          void loadPolicies()
        }}
      />
    )
  }

  return (
    <Stack spacing={2.1}>
      <Stack spacing={0.5}>
        <Typography variant="h2">Insurance Management</Typography>
        <Typography color="text.secondary">
          Review patient-submitted insurance policies, then activate or reject pending submissions.
        </Typography>
        <Chip label="Admin" color="info" sx={{ width: 'fit-content' }} />
      </Stack>

      {isReloading ? <LinearProgress aria-label="Refreshing policies" /> : null}

      {listError && policiesPage ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadPolicies()}>
              Retry
            </Button>
          }
        >
          {listError}
        </Alert>
      ) : null}

      <Grid container spacing={1.2}>
        <SummaryCard label="Pending" value={pageCounts.PENDING} />
        <SummaryCard label="Active" value={pageCounts.ACTIVE} />
        <SummaryCard label="Rejected" value={pageCounts.REJECTED} />
        <SummaryCard label="Expired" value={pageCounts.EXPIRED} />
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Grid container spacing={1.1}>
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-insurance-status-label">Status</InputLabel>
                  <Select
                    labelId="admin-insurance-status-label"
                    label="Status"
                    value={draftFilters.status}
                    onChange={(event) => {
                      const statusValue = event.target.value as PolicyStatus | 'ALL'
                      setDraftFilters((current) => ({ ...current, status: statusValue }))
                      setAppliedFilters((current) => ({ ...current, status: statusValue }))
                      setPage(0)
                    }}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <TextField
                  label="Policy Number"
                  placeholder="CC360-POL-1001"
                  value={draftFilters.policyNumber}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      policyNumber: event.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.2 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-insurance-sort-label">Sort</InputLabel>
                  <Select
                    labelId="admin-insurance-sort-label"
                    label="Sort"
                    value={selectedSort}
                    onChange={(event) => {
                      const nextSort = event.target.value as `${
                        AdminInsurancePolicySortField
                      },${SortDirection}`
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

              <Grid size={{ xs: 12, sm: 6, md: 1.8 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-insurance-size-label">Page Size</InputLabel>
                  <Select
                    labelId="admin-insurance-size-label"
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
              <Table aria-label="Admin insurance policy list">
                <TableHead>
                  <TableRow>
                    <TableCell>Policy ID</TableCell>
                    {patientColumnsVisible ? <TableCell>Patient</TableCell> : null}
                    {patientColumnsVisible ? <TableCell>Patient Email</TableCell> : null}
                    <TableCell>Provider</TableCell>
                    <TableCell>Policy Number</TableCell>
                    <TableCell>Coverage</TableCell>
                    <TableCell>Deductible</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {safePage.content.map((policy) => {
                    const rowBusy = activeAction?.policyId === policy.policyId
                    return (
                      <TableRow key={policy.policyId} hover>
                        <TableCell>{policy.policyId}</TableCell>
                        {patientColumnsVisible ? (
                          <TableCell>
                            {policy.patientName ?? (policy.patientId ? `Patient #${policy.patientId}` : 'Not provided')}
                          </TableCell>
                        ) : null}
                        {patientColumnsVisible ? (
                          <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>
                            {policy.patientEmail ?? 'Not provided'}
                          </TableCell>
                        ) : null}
                        <TableCell>{policy.providerName}</TableCell>
                        <TableCell sx={{ maxWidth: 220, wordBreak: 'break-all' }}>{policy.policyNumber}</TableCell>
                        <TableCell>{formatCoverage(policy.coveragePercentage)}</TableCell>
                        <TableCell>{formatUsd(policy.deductibleAmount)}</TableCell>
                        <TableCell>{formatLocalDate(policy.startDate)}</TableCell>
                        <TableCell>{formatLocalDate(policy.endDate)}</TableCell>
                        <TableCell>
                          <StatusChip status={policy.status} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.8}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setSelectedPolicy(policy)}
                              aria-label={`Review policy ${policy.policyNumber}`}
                            >
                              Review
                            </Button>
                            {isPendingPolicy(policy) ? (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={rowBusy}
                                  onClick={() => setPolicyForActivation(policy)}
                                >
                                  {rowBusy && activeAction?.type === 'activate' ? 'Activating...' : 'Activate'}
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  disabled={rowBusy}
                                  onClick={() => {
                                    setPolicyForRejection(policy)
                                    setRejectionReason('')
                                    setRejectionReasonError(null)
                                  }}
                                >
                                  {rowBusy && activeAction?.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No actions
                              </Typography>
                            )}
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
              {safePage.content.map((policy) => {
                const rowBusy = activeAction?.policyId === policy.policyId
                return (
                  <Grid key={policy.policyId} size={{ xs: 12, sm: 6 }}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack spacing={1}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h4" sx={{ fontSize: '1.02rem' }}>
                              {policy.providerName}
                            </Typography>
                            <StatusChip status={policy.status} />
                          </Stack>

                          <Typography variant="body2">Policy ID: {policy.policyId}</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            Policy Number: {policy.policyNumber}
                          </Typography>
                          {policy.patientName ? <Typography variant="body2">Patient: {policy.patientName}</Typography> : null}
                          {policy.patientEmail ? (
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              Patient Email: {policy.patientEmail}
                            </Typography>
                          ) : null}
                          <Typography variant="body2">Coverage: {formatCoverage(policy.coveragePercentage)}</Typography>
                          <Typography variant="body2">Deductible: {formatUsd(policy.deductibleAmount)}</Typography>
                          <Typography variant="body2">Start Date: {formatLocalDate(policy.startDate)}</Typography>
                          <Typography variant="body2">End Date: {formatLocalDate(policy.endDate)}</Typography>

                          <Stack spacing={0.8} sx={{ pt: 0.5 }}>
                            <Button
                              variant="outlined"
                              onClick={() => setSelectedPolicy(policy)}
                              aria-label={`Review policy ${policy.policyNumber}`}
                            >
                              Review
                            </Button>
                            {isPendingPolicy(policy) ? (
                              <>
                                <Button
                                  variant="contained"
                                  disabled={rowBusy}
                                  onClick={() => setPolicyForActivation(policy)}
                                >
                                  {rowBusy && activeAction?.type === 'activate' ? 'Activating...' : 'Activate'}
                                </Button>
                                <Button
                                  color="error"
                                  variant="outlined"
                                  disabled={rowBusy}
                                  onClick={() => {
                                    setPolicyForRejection(policy)
                                    setRejectionReason('')
                                    setRejectionReasonError(null)
                                  }}
                                >
                                  {rowBusy && activeAction?.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No actions
                              </Typography>
                            )}
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

      <Dialog
        open={Boolean(selectedPolicy)}
        onClose={() => setSelectedPolicy(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Policy Review</DialogTitle>
        <DialogContent>
          {selectedPolicy ? (
            <Stack spacing={1.1}>
              <Typography>
                Provider: <strong>{selectedPolicy.providerName}</strong>
              </Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: {selectedPolicy.policyNumber}
              </Typography>
              <Typography>Coverage: {formatCoverage(selectedPolicy.coveragePercentage)}</Typography>
              <Typography>Deductible: {formatUsd(selectedPolicy.deductibleAmount)}</Typography>
              <Typography>Start Date: {formatLocalDate(selectedPolicy.startDate)}</Typography>
              <Typography>End Date: {formatLocalDate(selectedPolicy.endDate)}</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography>Status:</Typography>
                <StatusChip status={selectedPolicy.status} />
              </Stack>
              {selectedPolicy.patientName ? <Typography>Patient: {selectedPolicy.patientName}</Typography> : null}
              {selectedPolicy.patientEmail ? (
                <Typography sx={{ wordBreak: 'break-word' }}>Patient Email: {selectedPolicy.patientEmail}</Typography>
              ) : null}
              {selectedPolicy.createdAt ? <Typography>Created: {selectedPolicy.createdAt}</Typography> : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPolicy(null)} startIcon={<CloseRoundedIcon />}>
            Close
          </Button>
          {selectedPolicy && isPendingPolicy(selectedPolicy) ? (
            <>
              <Button
                onClick={() => setPolicyForRejection(selectedPolicy)}
                color="error"
                variant="outlined"
                disabled={activeAction?.policyId === selectedPolicy.policyId}
              >
                Reject
              </Button>
              <Button
                onClick={() => setPolicyForActivation(selectedPolicy)}
                variant="contained"
                disabled={activeAction?.policyId === selectedPolicy.policyId}
              >
                Activate
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(policyForActivation)}
        onClose={() => {
          if (!activeAction) {
            setPolicyForActivation(null)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Activate policy?</DialogTitle>
        <DialogContent>
          {policyForActivation ? (
            <Stack spacing={1}>
              <Typography>
                Provider: <strong>{policyForActivation.providerName}</strong>
              </Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: <strong>{policyForActivation.policyNumber}</strong>
              </Typography>
              {policyForActivation.patientEmail ? <Typography>Patient: {policyForActivation.patientEmail}</Typography> : null}
              <Typography>
                Activating this policy makes it available for eligible claim creation workflows.
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyForActivation(null)} disabled={Boolean(activeAction)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (policyForActivation) {
                void runActivate(policyForActivation)
              }
            }}
            disabled={Boolean(activeAction)}
          >
            {activeAction?.type === 'activate' ? 'Activating...' : 'Confirm Activation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(policyForRejection)}
        onClose={() => {
          if (!activeAction) {
            setPolicyForRejection(null)
            setRejectionReason('')
            setRejectionReasonError(null)
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject policy?</DialogTitle>
        <DialogContent>
          {policyForRejection ? (
            <Stack spacing={1.1}>
              <Typography>
                Provider: <strong>{policyForRejection.providerName}</strong>
              </Typography>
              <Typography sx={{ wordBreak: 'break-all' }}>
                Policy Number: <strong>{policyForRejection.policyNumber}</strong>
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
                  rejectionReasonError ?? `${REJECTION_REASON_MAX_LENGTH - rejectionReason.length} characters remaining`
                }
                aria-describedby="reject-policy-reason-helper"
              />
              <Typography variant="caption" color="text.secondary">
                Backend validates reason as required and max 255 characters. The current backend entity does not
                persist the rejection reason.
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPolicyForRejection(null)
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
              if (policyForRejection) {
                void runReject(policyForRejection)
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
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : (
          <Box />
        )}
      </Snackbar>
    </Stack>
  )
}
