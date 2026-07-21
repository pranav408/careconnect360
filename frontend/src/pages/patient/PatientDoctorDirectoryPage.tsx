import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Pagination, Stack, Switch, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/apiClient'
import { getDoctors } from '../../api/doctorApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { formatUsd } from '../../components/dashboard/dashboardFormatters'
import { AppointmentBookingDialog } from '../../components/patient/AppointmentBookingDialog'
import { DoctorCardSkeleton } from '../../components/patient/DoctorCardSkeleton'
import type { AppointmentResponse } from '../../types/appointment'
import type { DoctorDirectoryResponse, DoctorProfileResponse } from '../../types/doctor'

const PAGE_SIZE = 6

export function PatientDoctorDirectoryPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [directory, setDirectory] = useState<DoctorDirectoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfileResponse | null>(null)

  const loadDoctors = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getDoctors({
        name: name.trim() || undefined,
        specialization: specialization.trim() || undefined,
        available: availableOnly ? true : undefined,
        page: page - 1,
        size: PAGE_SIZE,
        sort: 'fullName,asc',
      })
      setDirectory(response)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [availableOnly, name, page, specialization])

  useEffect(() => {
    queueMicrotask(() => {
      void loadDoctors()
    })
  }, [loadDoctors])

  const hasActiveFilters = useMemo(
    () => name.trim().length > 0 || specialization.trim().length > 0 || availableOnly,
    [availableOnly, name, specialization],
  )

  const handleClearFilters = () => {
    setName('')
    setSpecialization('')
    setAvailableOnly(false)
    setPage(1)
  }

  const handleBooked = (appointment: AppointmentResponse) => {
    navigate('/patient/appointments', {
      state: {
        flashMessage: `Appointment booked successfully with status ${appointment.status}.`,
      },
    })
  }

  if (errorMessage && !directory) {
    return (
      <PageError
        title="Unable to load doctors"
        message={errorMessage}
        onRetry={() => {
          void loadDoctors()
        }}
      />
    )
  }

  const doctors = directory?.content ?? []

  return (
    <Stack spacing={2.2}>
      <Stack spacing={0.7}>
        <Typography variant="h2">Find Doctors</Typography>
        <Typography color="text.secondary">
          Search specialists and book appointments with doctors available in your CareConnect network.
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Grid container spacing={1.4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Doctor Name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Specialization"
                value={specialization}
                onChange={(event) => {
                  setSpecialization(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pt: { xs: 0, md: 1.4 } }}>
                <Switch
                  checked={availableOnly}
                  onChange={(event) => {
                    setAvailableOnly(event.target.checked)
                    setPage(1)
                  }}
                  slotProps={{ input: { 'aria-label': 'Available doctors only' } }}
                />
                <Typography>Available only</Typography>
              </Stack>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </Button>
            <Button variant="contained" onClick={() => void loadDoctors()}>
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {errorMessage && directory ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void loadDoctors()}>Retry</Button>}>
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <DoctorCardSkeleton key={`doctor-skeleton-${index}`} />
          ))}
        </Grid>
      ) : null}

      {!isLoading && doctors.length === 0 ? (
        <EmptyState
          icon={<MedicalServicesRoundedIcon />}
          title="No doctors match your filters"
          description="Try adjusting the doctor name, specialization, or availability toggle and search again."
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      ) : null}

      {!isLoading && doctors.length > 0 ? (
        <Grid container spacing={2}>
          {doctors.map((doctor) => (
            <Grid key={doctor.doctorId} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.3}>
                    <Stack spacing={0.3}>
                      <Typography variant="h4">{doctor.fullName}</Typography>
                      <Typography color="text.secondary">{doctor.specialization}</Typography>
                    </Stack>

                    <Typography variant="body2">
                      Consultation fee: <strong>{formatUsd(doctor.consultationFee)}</strong>
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2">Availability:</Typography>
                      <Chip
                        label={doctor.availableForAppointments ? 'Available' : 'Unavailable'}
                        color={doctor.availableForAppointments ? 'success' : 'default'}
                        size="small"
                      />
                    </Stack>

                    {doctor.licenseNumber ? (
                      <Typography variant="body2" color="text.secondary">
                        License: {doctor.licenseNumber}
                      </Typography>
                    ) : null}

                    <Stack direction="row" spacing={1} sx={{ pt: 0.6, flexWrap: 'wrap', rowGap: 1 }}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate(`/patient/doctors/${doctor.doctorId}`)}
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setSelectedDoctor(doctor)}
                        disabled={!doctor.availableForAppointments}
                      >
                        Book Appointment
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : null}

      {!isLoading && directory && directory.totalPages > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <Pagination
            count={directory.totalPages}
            page={page}
            onChange={(_, nextPage) => setPage(nextPage)}
            color="primary"
          />
        </Box>
      ) : null}

      <AppointmentBookingDialog
        doctor={selectedDoctor}
        open={Boolean(selectedDoctor)}
        onClose={() => setSelectedDoctor(null)}
        onBooked={handleBooked}
      />
    </Stack>
  )
}
