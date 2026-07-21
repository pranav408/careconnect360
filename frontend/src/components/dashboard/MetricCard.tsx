import { Card, CardContent, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  helperText: string
  icon: ReactNode
  gradient: string
}

export function MetricCard({ label, value, helperText, icon, gradient }: MetricCardProps) {
  return (
    <Card
      sx={{
        background: gradient,
        color: '#FFFFFF',
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ opacity: 0.92 }}>
              {label}
            </Typography>
            <MetricIconContainer>{icon}</MetricIconContainer>
          </Stack>

          <Typography variant="h2" component="p" sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.92 }}>
            {helperText}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

function MetricIconContainer({ children }: { children: ReactNode }) {
  const iconContainerSx: SxProps<Theme> = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    bgcolor: 'rgba(255, 255, 255, 0.2)',
    '& svg': {
      fontSize: 20,
    },
  }

  return <Stack sx={iconContainerSx}>{children}</Stack>
}
