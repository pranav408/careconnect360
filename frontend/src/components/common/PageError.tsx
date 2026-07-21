import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'

interface PageErrorProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function PageError({
  title = 'Something went wrong',
  message,
  onRetry,
}: PageErrorProps) {
  return (
    <Box sx={{ py: 5 }}>
      <Stack spacing={2.5} sx={{ alignItems: 'flex-start', maxWidth: 560 }}>
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
          <ErrorOutlineRoundedIcon color="error" />
          <Typography variant="h4">{title}</Typography>
        </Stack>

        <Alert severity="error" sx={{ width: '100%' }}>
          {message}
        </Alert>

        {onRetry ? (
          <Button variant="contained" color="primary" onClick={onRetry}>
            Try Again
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
