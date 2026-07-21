import { Alert } from '@mui/material'

interface ApiErrorAlertProps {
  message: string | null
}

export function ApiErrorAlert({ message }: ApiErrorAlertProps) {
  if (!message) {
    return null
  }

  return <Alert severity="error">{message}</Alert>
}
