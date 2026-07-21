import { Box, CircularProgress, Typography } from '@mui/material'

interface FullScreenLoadingProps {
  message?: string
}

export function FullScreenLoading({
  message = 'Loading CareConnect 360...',
}: FullScreenLoadingProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 3,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={42} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {message}
        </Typography>
      </Box>
    </Box>
  )
}
