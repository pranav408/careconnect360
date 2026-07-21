import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'

interface AppointmentActionDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success'
  appointmentContext: {
    patientName: string
    appointmentDate: string
    appointmentTimeLabel: string
  } | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AppointmentActionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmColor = 'primary',
  appointmentContext,
  loading,
  onClose,
  onConfirm,
}: AppointmentActionDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.1}>
          <Typography>{description}</Typography>
          {appointmentContext ? (
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Patient: {appointmentContext.patientName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {appointmentContext.appointmentDate}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time: {appointmentContext.appointmentTimeLabel}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button color={confirmColor} variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
