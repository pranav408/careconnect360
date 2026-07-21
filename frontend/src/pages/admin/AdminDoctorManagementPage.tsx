import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
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
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
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
import { createAdminDoctor, getAdminDoctorDetail, listAdminDoctors } from '../../api/adminDoctorApi'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { formatUsd } from '../../components/dashboard/dashboardFormatters'
import type {
  AdminDoctorQuery,
  AdminDoctorResponse,
  AdminDoctorSortField,
  AdminDoctorsPageResponse,
  CreateDoctorRequest,
  SortDirection,
} from '../../types/adminDoctor'

interface SearchFilters {
  name: string
  specialization: string
  available: 'ALL' | 'AVAILABLE' | 'UNAVAILABLE'
}

interface CreateDoctorFormValues {
  email: string
  password: string
  fullName: string
  specialization: string
  licenseNumber: string
  phone: string
  clinicAddress: string
  consultationFee: string
}

type CreateDoctorFormErrors = Partial<Record<keyof CreateDoctorFormValues, string>>

interface SortOption {
  value: `${AdminDoctorSortField},${SortDirection}`
  label: string
}

interface SnackbarState {
  severity: 'success' | 'error'
  message: string
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: `${AdminDoctorSortField},${SortDirection}` = 'fullName,asc'
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const SORT_OPTIONS: SortOption[] = [
  { value: 'fullName,asc', label: 'Name A-Z' },
  { value: 'fullName,desc', label: 'Name Z-A' },
  { value: 'specialization,asc', label: 'Specialization A-Z' },
  { value: 'specialization,desc', label: 'Specialization Z-A' },
  { value: 'consultationFee,asc', label: 'Consultation fee lowest' },
  { value: 'consultationFee,desc', label: 'Consultation fee highest' },
]

function createEmptyPage(): AdminDoctorsPageResponse {
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

function toListErrorTitle(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted'
  }

  if (status === 400) {
    return 'Invalid doctor query'
  }

  if (status && status >= 500) {
    return 'Doctor service unavailable'
  }

  return 'Unable to load doctors'
}

function toListErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Your account is not allowed to access admin doctor management.'
  }

  return getApiErrorMessage(error)
}

function toCreateErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'You are not authorized to create doctor accounts.'
  }

  if (status === 409) {
    return getApiErrorMessage(error)
  }

  if (status === 400) {
    return getApiErrorMessage(error)
  }

  if (status && status >= 500) {
    return 'The doctor service is temporarily unavailable. Please try again.'
  }

  return getApiErrorMessage(error)
}

function toDetailErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 404) {
    return 'This doctor was not found. Refresh the list and try again.'
  }

  if (status === 403) {
    return 'You are not authorized to review this doctor profile.'
  }

  return getApiErrorMessage(error)
}

function hasAnyFilter(filters: SearchFilters): boolean {
  return (
    filters.name.trim().length > 0 ||
    filters.specialization.trim().length > 0 ||
    filters.available !== 'ALL'
  )
}

function availabilityLabel(availableForAppointments: boolean): 'Available' | 'Unavailable' {
  return availableForAppointments ? 'Available' : 'Unavailable'
}

function safeText(value: string | null | undefined): string {
  if (!value) {
    return 'Not provided'
  }

  return value
}

function buildQuery(
  filters: SearchFilters,
  page: number,
  size: number,
  sort: `${AdminDoctorSortField},${SortDirection}`,
): AdminDoctorQuery {
  const query: AdminDoctorQuery = {
    page,
    size,
    sort,
  }

  const trimmedName = filters.name.trim()
  if (trimmedName) {
    query.name = trimmedName
  }

  const trimmedSpecialization = filters.specialization.trim()
  if (trimmedSpecialization) {
    query.specialization = trimmedSpecialization
  }

  if (filters.available === 'AVAILABLE') {
    query.available = true
  }

  if (filters.available === 'UNAVAILABLE') {
    query.available = false
  }

  return query
}

function createInitialFormValues(): CreateDoctorFormValues {
  return {
    email: '',
    password: '',
    fullName: '',
    specialization: '',
    licenseNumber: '',
    phone: '',
    clinicAddress: '',
    consultationFee: '',
  }
}

function validateCreateDoctor(values: CreateDoctorFormValues): CreateDoctorFormErrors {
  const errors: CreateDoctorFormErrors = {}
  const email = values.email.trim()
  const fullName = values.fullName.trim()
  const specialization = values.specialization.trim()
  const licenseNumber = values.licenseNumber.trim()
  const phone = values.phone.trim()
  const clinicAddress = values.clinicAddress.trim()

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  } else if (email.length > 120) {
    errors.email = 'Email cannot exceed 120 characters.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (values.password.length < 8 || values.password.length > 72) {
    errors.password = 'Password must contain between 8 and 72 characters.'
  }

  if (!fullName) {
    errors.fullName = 'Doctor name is required.'
  } else if (fullName.length > 120) {
    errors.fullName = 'Doctor name cannot exceed 120 characters.'
  }

  if (!specialization) {
    errors.specialization = 'Specialization is required.'
  } else if (specialization.length > 100) {
    errors.specialization = 'Specialization cannot exceed 100 characters.'
  }

  if (!licenseNumber) {
    errors.licenseNumber = 'License number is required.'
  } else if (licenseNumber.length > 50) {
    errors.licenseNumber = 'License number cannot exceed 50 characters.'
  }

  if (!phone) {
    errors.phone = 'Phone number is required.'
  } else if (phone.length > 20) {
    errors.phone = 'Phone number cannot exceed 20 characters.'
  }

  if (clinicAddress.length > 255) {
    errors.clinicAddress = 'Clinic address cannot exceed 255 characters.'
  }

  if (!values.consultationFee.trim()) {
    errors.consultationFee = 'Consultation fee is required.'
  } else {
    const parsedFee = Number(values.consultationFee)

    if (Number.isNaN(parsedFee)) {
      errors.consultationFee = 'Enter a valid consultation fee.'
    } else if (parsedFee < 0) {
      errors.consultationFee = 'Consultation fee cannot be negative.'
    }
  }

  return errors
}

function toCreateRequest(values: CreateDoctorFormValues): CreateDoctorRequest {
  const clinicAddress = values.clinicAddress.trim()

  return {
    email: values.email.trim().toLowerCase(),
    password: values.password,
    fullName: values.fullName.trim(),
    specialization: values.specialization.trim(),
    licenseNumber: values.licenseNumber.trim(),
    phone: values.phone.trim(),
    clinicAddress: clinicAddress || undefined,
    consultationFee: Number(values.consultationFee),
  }
}

function LoadingSkeleton() {
  return (
    <Stack spacing={2} role="status" aria-live="polite" aria-label="Loading doctor management">
      <Skeleton variant="text" width="34%" height={48} />
      <Skeleton variant="text" width="70%" />
      <Grid container spacing={1.2}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={54} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={280} />
    </Stack>
  )
}

export function AdminDoctorManagementPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [draftFilters, setDraftFilters] = useState<SearchFilters>({
    name: '',
    specialization: '',
    available: 'ALL',
  })
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    name: '',
    specialization: '',
    available: 'ALL',
  })
  const [selectedSort, setSelectedSort] = useState<`${AdminDoctorSortField},${SortDirection}`>(DEFAULT_SORT)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [doctorsPage, setDoctorsPage] = useState<AdminDoctorsPageResponse | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [listErrorTitle, setListErrorTitle] = useState('Unable to load doctors')
  const [listError, setListError] = useState<string | null>(null)

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [doctorDetail, setDoctorDetail] = useState<AdminDoctorResponse | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createFormValues, setCreateFormValues] = useState<CreateDoctorFormValues>(createInitialFormValues)
  const [createFormErrors, setCreateFormErrors] = useState<CreateDoctorFormErrors>({})
  const [createApiError, setCreateApiError] = useState<string | null>(null)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const loadDoctors = useCallback(async () => {
    const query = buildQuery(appliedFilters, page, pageSize, selectedSort)

    setListError(null)

    if (hasLoadedOnceRef.current) {
      setIsReloading(true)
    }

    try {
      const response = await listAdminDoctors(query)
      setDoctorsPage(response)
    } catch (error) {
      setListErrorTitle(toListErrorTitle(error))
      setListError(toListErrorMessage(error))
    } finally {
      hasLoadedOnceRef.current = true
      setIsInitialLoading(false)
      setIsReloading(false)
    }
  }, [appliedFilters, page, pageSize, selectedSort])

  const loadDoctorDetail = useCallback(async (doctorId: number) => {
    setIsDetailLoading(true)
    setDetailError(null)

    try {
      const detail = await getAdminDoctorDetail(doctorId)
      setDoctorDetail(detail)
    } catch (error) {
      setDetailError(toDetailErrorMessage(error))
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadDoctors()
    })
  }, [loadDoctors])

  useEffect(() => {
    if (!selectedDoctorId) {
      return
    }

    queueMicrotask(() => {
      void loadDoctorDetail(selectedDoctorId)
    })
  }, [loadDoctorDetail, selectedDoctorId])

  const safePage = doctorsPage ?? createEmptyPage()

  const showEmptyState = !isInitialLoading && !listError && safePage.content.length === 0

  const appliedSummary = useMemo(() => {
    const summary: string[] = []

    if (appliedFilters.name.trim()) {
      summary.push(`Name: ${appliedFilters.name.trim()}`)
    }

    if (appliedFilters.specialization.trim()) {
      summary.push(`Specialization: ${appliedFilters.specialization.trim()}`)
    }

    if (appliedFilters.available === 'AVAILABLE') {
      summary.push('Availability: Available')
    }

    if (appliedFilters.available === 'UNAVAILABLE') {
      summary.push('Availability: Unavailable')
    }

    if (summary.length === 0) {
      return 'Showing all doctors'
    }

    return summary.join(' | ')
  }, [appliedFilters])

  const handleSearch = () => {
    setAppliedFilters({ ...draftFilters })
    setPage(0)
  }

  const handleClearFilters = () => {
    const resetFilters: SearchFilters = {
      name: '',
      specialization: '',
      available: 'ALL',
    }

    setDraftFilters(resetFilters)
    setAppliedFilters(resetFilters)
    setSelectedSort(DEFAULT_SORT)
    setPage(0)
    setPageSize(DEFAULT_PAGE_SIZE)
  }

  const handleCreateFieldChange = <K extends keyof CreateDoctorFormValues>(
    field: K,
    value: CreateDoctorFormValues[K],
  ) => {
    setCreateFormValues((current) => ({
      ...current,
      [field]: value,
    }))

    if (createFormErrors[field]) {
      setCreateFormErrors((current) => ({
        ...current,
        [field]: undefined,
      }))
    }

    if (createApiError) {
      setCreateApiError(null)
    }
  }

  const resetCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setCreateFormValues(createInitialFormValues())
    setCreateFormErrors({})
    setCreateApiError(null)
    setShowPassword(false)
  }

  const handleCloseDetailDialog = () => {
    setSelectedDoctorId(null)
    setDoctorDetail(null)
    setDetailError(null)
  }

  const handleCloseCreateDialog = () => {
    if (isCreateSubmitting) {
      return
    }

    resetCreateDialog()
  }

  const handleSubmitCreateDoctor = async () => {
    if (isCreateSubmitting) {
      return
    }

    const errors = validateCreateDoctor(createFormValues)
    setCreateFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsCreateSubmitting(true)
    setCreateApiError(null)

    try {
      const payload = toCreateRequest(createFormValues)
      const response = await createAdminDoctor(payload)

      setSnackbar({
        severity: 'success',
        message: response.message,
      })

      resetCreateDialog()
      await loadDoctors()
    } catch (error) {
      setCreateApiError(toCreateErrorMessage(error))
    } finally {
      setIsCreateSubmitting(false)
    }
  }

  if (isInitialLoading && !doctorsPage) {
    return <LoadingSkeleton />
  }

  if (listError && !doctorsPage) {
    return <PageError title={listErrorTitle} message={listError} onRetry={() => void loadDoctors()} />
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.6}>
        <Typography variant="h2" component="h1">
          Doctor Management
        </Typography>
        <Typography color="text.secondary">
          Create doctor accounts and review the doctor directory returned by the backend API.
        </Typography>
        <Chip label="Admin" color="info" sx={{ width: 'fit-content' }} aria-label="Admin role" />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Button
          variant="contained"
          startIcon={<MedicalServicesRoundedIcon />}
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Add Doctor
        </Button>
        <Typography variant="body2" color="text.secondary">
          Account status and email are not returned by current list/detail APIs.
        </Typography>
      </Stack>

      {isReloading ? <LinearProgress aria-label="Refreshing doctors" /> : null}

      {listError && doctorsPage ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadDoctors()}>
              Retry
            </Button>
          }
        >
          {listError}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Grid container spacing={1.1}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Doctor Name"
                  placeholder="Dr. Priya Sharma"
                  value={draftFilters.name}
                  onChange={(event) => {
                    setDraftFilters((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Specialization"
                  placeholder="Cardiology"
                  value={draftFilters.specialization}
                  onChange={(event) => {
                    setDraftFilters((current) => ({
                      ...current,
                      specialization: event.target.value,
                    }))
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-doctor-available-label">Availability</InputLabel>
                  <Select
                    labelId="admin-doctor-available-label"
                    label="Availability"
                    value={draftFilters.available}
                    onChange={(event) => {
                      const availability = event.target.value as SearchFilters['available']
                      setDraftFilters((current) => ({
                        ...current,
                        available: availability,
                      }))
                    }}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    <MenuItem value="AVAILABLE">Available</MenuItem>
                    <MenuItem value="UNAVAILABLE">Unavailable</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-doctor-sort-label">Sort</InputLabel>
                  <Select
                    labelId="admin-doctor-sort-label"
                    label="Sort"
                    value={selectedSort}
                    onChange={(event) => {
                      const nextSort = event.target.value as `${AdminDoctorSortField},${SortDirection}`
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

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="admin-doctor-size-label">Page Size</InputLabel>
                  <Select
                    labelId="admin-doctor-size-label"
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

      {showEmptyState ? (
        <EmptyState
          title={hasAnyFilter(appliedFilters) ? 'No doctors match your filters' : 'No doctors in the directory'}
          description={
            hasAnyFilter(appliedFilters)
              ? 'Try adjusting your filters or clear them to view all doctors.'
              : 'Create a doctor account to populate the directory.'
          }
          actionLabel={hasAnyFilter(appliedFilters) ? 'Clear Filters' : undefined}
          onAction={hasAnyFilter(appliedFilters) ? handleClearFilters : undefined}
        />
      ) : null}

      {!showEmptyState ? (
        <>
          {isDesktop ? (
            <TableContainer>
              <Table aria-label="Admin doctor list">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Specialization</TableCell>
                    <TableCell>License Number</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Consultation Fee</TableCell>
                    <TableCell>Availability</TableCell>
                    <TableCell>Clinic Address</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {safePage.content.map((doctor) => (
                    <TableRow key={doctor.doctorId} hover>
                      <TableCell sx={{ minWidth: 180, wordBreak: 'break-word' }}>{safeText(doctor.fullName)}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-word' }}>{safeText(doctor.specialization)}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-word' }}>{safeText(doctor.licenseNumber)}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-word' }}>{safeText(doctor.phone)}</TableCell>
                      <TableCell>{formatUsd(doctor.consultationFee)}</TableCell>
                      <TableCell>{availabilityLabel(doctor.availableForAppointments)}</TableCell>
                      <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>
                        {safeText(doctor.clinicAddress)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedDoctorId(doctor.doctorId)
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Grid container spacing={1.2}>
              {safePage.content.map((doctor) => (
                <Grid key={doctor.doctorId} size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack spacing={0.9}>
                        <Typography variant="h4" sx={{ fontSize: '1.02rem', wordBreak: 'break-word' }}>
                          {safeText(doctor.fullName)}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          Specialization: {safeText(doctor.specialization)}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          License Number: {safeText(doctor.licenseNumber)}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          Phone: {safeText(doctor.phone)}
                        </Typography>
                        <Typography variant="body2">Consultation Fee: {formatUsd(doctor.consultationFee)}</Typography>
                        <Typography variant="body2">
                          Availability: {availabilityLabel(doctor.availableForAppointments)}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          Clinic Address: {safeText(doctor.clinicAddress)}
                        </Typography>
                        <Button variant="outlined" onClick={() => setSelectedDoctorId(doctor.doctorId)}>
                          Review
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
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
        open={selectedDoctorId !== null}
        onClose={handleCloseDetailDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Doctor Review</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.2 }}>
            Review safe directory fields returned by the doctor profile API.
          </DialogContentText>

          {isDetailLoading ? <LinearProgress aria-label="Loading doctor detail" /> : null}

          {detailError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (selectedDoctorId) {
                      void loadDoctorDetail(selectedDoctorId)
                    }
                  }}
                >
                  Retry
                </Button>
              }
            >
              {detailError}
            </Alert>
          ) : null}

          {doctorDetail ? (
            <Stack spacing={1} sx={{ mt: 1.2 }}>
              <Typography sx={{ wordBreak: 'break-word' }}>
                Name: <strong>{safeText(doctorDetail.fullName)}</strong>
              </Typography>
              <Typography sx={{ wordBreak: 'break-word' }}>
                Specialization: {safeText(doctorDetail.specialization)}
              </Typography>
              <Typography sx={{ wordBreak: 'break-word' }}>
                License Number: {safeText(doctorDetail.licenseNumber)}
              </Typography>
              <Typography sx={{ wordBreak: 'break-word' }}>Phone: {safeText(doctorDetail.phone)}</Typography>
              <Typography>Consultation Fee: {formatUsd(doctorDetail.consultationFee)}</Typography>
              <Typography>Availability: {availabilityLabel(doctorDetail.availableForAppointments)}</Typography>
              <Typography sx={{ wordBreak: 'break-word' }}>
                Clinic Address: {safeText(doctorDetail.clinicAddress)}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog} startIcon={<CloseRoundedIcon />}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Doctor</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.2 }}>
            Only fields required by CreateDoctorRequest are submitted to the backend.
          </DialogContentText>

          <Stack spacing={1.1}>
            {createApiError ? <Alert severity="error">{createApiError}</Alert> : null}

            <TextField
              label="Email"
              placeholder="doctor@careconnect360.com"
              value={createFormValues.email}
              onChange={(event) => handleCreateFieldChange('email', event.target.value)}
              error={Boolean(createFormErrors.email)}
              helperText={createFormErrors.email}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={createFormValues.password}
              onChange={(event) => handleCreateFieldChange('password', event.target.value)}
              error={Boolean(createFormErrors.password)}
              helperText={createFormErrors.password}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Doctor Name"
              value={createFormValues.fullName}
              onChange={(event) => handleCreateFieldChange('fullName', event.target.value)}
              error={Boolean(createFormErrors.fullName)}
              helperText={createFormErrors.fullName}
            />

            <TextField
              label="Specialization"
              value={createFormValues.specialization}
              onChange={(event) => handleCreateFieldChange('specialization', event.target.value)}
              error={Boolean(createFormErrors.specialization)}
              helperText={createFormErrors.specialization}
            />

            <TextField
              label="License Number"
              value={createFormValues.licenseNumber}
              onChange={(event) => handleCreateFieldChange('licenseNumber', event.target.value)}
              error={Boolean(createFormErrors.licenseNumber)}
              helperText={createFormErrors.licenseNumber}
            />

            <TextField
              label="Phone"
              value={createFormValues.phone}
              onChange={(event) => handleCreateFieldChange('phone', event.target.value)}
              error={Boolean(createFormErrors.phone)}
              helperText={createFormErrors.phone}
            />

            <TextField
              label="Clinic Address"
              value={createFormValues.clinicAddress}
              onChange={(event) => handleCreateFieldChange('clinicAddress', event.target.value)}
              error={Boolean(createFormErrors.clinicAddress)}
              helperText={createFormErrors.clinicAddress}
            />

            <TextField
              label="Consultation Fee"
              value={createFormValues.consultationFee}
              onChange={(event) => handleCreateFieldChange('consultationFee', event.target.value)}
              error={Boolean(createFormErrors.consultationFee)}
              helperText={createFormErrors.consultationFee}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog} disabled={isCreateSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleSubmitCreateDoctor()
            }}
            disabled={isCreateSubmitting}
          >
            {isCreateSubmitting ? 'Creating...' : 'Create Doctor'}
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
