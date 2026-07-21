import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { format } from 'date-fns'

interface PatientDashboardHeaderProps {
  fullName: string
}

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0]?.[0] ?? 'P'
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

export function PatientDashboardHeader({ fullName }: PatientDashboardHeaderProps) {
  return (
    <Paper
      sx={{
        p: { xs: 2.2, sm: 3 },
        border: '1px solid',
        borderColor: 'divider',
        background:
          'linear-gradient(130deg, rgba(15,118,110,0.18) 0%, rgba(21,101,192,0.16) 100%), #FFFFFF',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50 }}>
            {initialsOf(fullName)}
          </Avatar>

          <Box>
            <Typography variant="h3" component="h1">
              Welcome back, {fullName}
            </Typography>
            <Typography color="text.secondary">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} · Stay on top of your care plan today.
            </Typography>
          </Box>
        </Stack>

        <Chip icon={<LocalHospitalRoundedIcon />} color="secondary" label="Patient" />
      </Stack>
    </Paper>
  )
}
