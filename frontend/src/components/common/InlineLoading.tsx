import { CircularProgress, Stack, Typography } from '@mui/material'

interface InlineLoadingProps {
  message?: string
}

export function InlineLoading({ message = 'Loading...' }: InlineLoadingProps) {
  return (
    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', py: 1 }}>
      <CircularProgress size={18} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Stack>
  )
}
