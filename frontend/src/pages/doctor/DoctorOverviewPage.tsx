import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import { Button, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function DoctorOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <Stack spacing={2.2}>
      <Stack spacing={0.8}>
        <Typography variant="h2">Doctor Workspace</Typography>
        <Chip label="Doctor" color="secondary" sx={{ alignSelf: 'flex-start' }} />
        <Typography color="text.secondary">
          Welcome, Dr. {user?.displayName}. Manage assigned appointments and complete care workflows from one secure workspace.
        </Typography>
      </Stack>

      <Stack
        spacing={1.2}
        sx={{
          p: 2.2,
          borderRadius: 3,
          border: '1px dashed',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h4">Overview coming soon</Typography>
        <Typography color="text.secondary">
          Dedicated analytics and care insights will be added in a future milestone. Appointment workflows are fully available now.
        </Typography>
        <Button
          startIcon={<EventAvailableRoundedIcon />}
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => navigate('/doctor/appointments')}
        >
          Open Appointments
        </Button>
      </Stack>
    </Stack>
  )
}
