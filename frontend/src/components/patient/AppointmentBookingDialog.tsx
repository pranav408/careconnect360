import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { createAppointment } from '../../api/appointmentApi'
import { getApiErrorMessage } from '../../api/apiClient'
import type { AppointmentResponse } from '../../types/appointment'
import type { DoctorProfileResponse } from '../../types/doctor'

interface AppointmentBookingDialogProps {
  doctor: DoctorProfileResponse | null
  open: boolean
  onClose: () => void
  onBooked: (appointment: AppointmentResponse) => void
}

function todayLocalDate(): string {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeLocalTime(value: string): string {
  if (value.length === 5) {
    return `${value}:00`
  }

  return value
}

export function AppointmentBookingDialog({
  doctor,
  open,
  onClose,
  onBooked,
}: AppointmentBookingDialogProps) {
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const minDate = useMemo(() => todayLocalDate(), [])

  const isFormValid =
    Boolean(doctor) &&
    appointmentDate >= minDate &&
    appointmentTime.trim().length > 0 &&
    reason.trim().length > 0 &&
    reason.trim().length <= 500

  const resetForm = () => {
    setAppointmentDate('')
    setAppointmentTime('')
    setReason('')
    setErrorMessage(null)
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!doctor || !isFormValid) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await createAppointment({
        doctorId: doctor.doctorId,
        appointmentDate,
        appointmentTime: normalizeLocalTime(appointmentTime),
        reason: reason.trim(),
      })

      resetForm()
      onBooked(response)
      onClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Book Appointment</DialogTitle>
      <DialogContent>
        <Stack spacing={1.8} sx={{ pt: 0.5 }}>
          {doctor ? (
            <Typography variant="body2" color="text.secondary">
              Booking with {doctor.fullName} ({doctor.specialization})
            </Typography>
          ) : null}

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <TextField
            label="Appointment Date"
            type="date"
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: minDate },
            }}
            required
          />

          <TextField
            label="Appointment Time"
            type="time"
            value={appointmentTime}
            onChange={(event) => setAppointmentTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />

          <TextField
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            helperText={`${reason.length}/500`}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
