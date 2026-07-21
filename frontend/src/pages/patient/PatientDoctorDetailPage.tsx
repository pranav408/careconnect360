import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { getDoctorById } from '../../api/doctorApi'
import { EmptyState } from '../../components/common/EmptyState'
import { InlineLoading } from '../../components/common/InlineLoading'
import { PageError } from '../../components/common/PageError'
import { formatUsd } from '../../components/dashboard/dashboardFormatters'
import { AppointmentBookingDialog } from '../../components/patient/AppointmentBookingDialog'
import type { AppointmentResponse } from '../../types/appointment'
import type { DoctorProfileResponse } from '../../types/doctor'

export function PatientDoctorDetailPage() {
  const navigate = useNavigate()
  const { doctorId } = useParams()
  const [doctor, setDoctor] = useState<DoctorProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  const parsedDoctorId = Number(doctorId)

  const loadDoctor = useCallback(async () => {
    if (!Number.isFinite(parsedDoctorId)) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setIsNotFound(false)

    try {
      const response = await getDoctorById(parsedDoctorId)
      setDoctor(response)
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        setIsNotFound(true)
      } else {
        setErrorMessage(getApiErrorMessage(error))
      }
    } finally {
      setIsLoading(false)
    }
  }, [parsedDoctorId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadDoctor()
    })
  }, [loadDoctor])

  const handleBooked = (appointment: AppointmentResponse) => {
    navigate('/patient/appointments', {
      state: {
        flashMessage: `Appointment booked successfully with status ${appointment.status}.`,
      },
    })
  }

  if (isLoading) {
    return <InlineLoading message="Loading doctor profile..." />
  }

  if (isNotFound) {
    return (
      <EmptyState
        title="Doctor not found"
        description="The doctor profile does not exist or is no longer available."
        actionLabel="Back to directory"
        onAction={() => navigate('/patient/doctors')}
      />
    )
  }

  if (errorMessage || !doctor) {
    return (
      <PageError
        title="Unable to load doctor profile"
        message={errorMessage ?? 'Doctor profile is unavailable.'}
        onRetry={() => {
          void loadDoctor()
        }}
      />
    )
  }

  return (
    <Stack spacing={2.1}>
      <Button
        variant="text"
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/patient/doctors')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to directory
      </Button>

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack spacing={0.2}>
              <Typography variant="h2">{doctor.fullName}</Typography>
              <Typography color="text.secondary">{doctor.specialization}</Typography>
            </Stack>

            <Typography>
              Consultation fee: <strong>{formatUsd(doctor.consultationFee)}</strong>
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography>Availability:</Typography>
              <Chip
                label={doctor.availableForAppointments ? 'Available' : 'Unavailable'}
                color={doctor.availableForAppointments ? 'success' : 'default'}
                size="small"
              />
            </Stack>

            {doctor.licenseNumber ? <Typography>License number: {doctor.licenseNumber}</Typography> : null}
            {doctor.phone ? <Typography>Phone: {doctor.phone}</Typography> : null}
            {doctor.clinicAddress ? <Typography>Clinic address: {doctor.clinicAddress}</Typography> : null}

            {!doctor.availableForAppointments ? (
              <Alert severity="warning">
                This doctor is currently unavailable for new appointments.
              </Alert>
            ) : null}

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/patient/doctors')}>
                Back to directory
              </Button>
              <Button
                variant="contained"
                onClick={() => setIsBookingOpen(true)}
                disabled={!doctor.availableForAppointments}
              >
                Book Appointment
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <AppointmentBookingDialog
        doctor={doctor}
        open={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBooked={handleBooked}
      />
    </Stack>
  )
}
