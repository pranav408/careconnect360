import { Chip } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { formatStatusLabel } from './dashboardFormatters'

interface StatusChipProps {
  status: string
  size?: 'small' | 'medium'
}

function colorForStatus(status: string): ChipProps['color'] {
  const normalized = status.toUpperCase()

  if (normalized === 'PENDING') {
    return 'warning'
  }

  if (normalized === 'INITIATED') {
    return 'warning'
  }

  if (normalized === 'ACTIVE') {
    return 'success'
  }

  if (normalized === 'REQUESTED' || normalized === 'SUBMITTED') {
    return 'info'
  }

  if (normalized === 'CONFIRMED' || normalized === 'VERIFIED') {
    return 'primary'
  }

  if (normalized === 'APPROVED' || normalized === 'COMPLETED' || normalized === 'PAID') {
    return 'success'
  }

  if (normalized === 'REJECTED' || normalized === 'FAILED') {
    return 'error'
  }

  if (normalized === 'CANCELLED' || normalized === 'EXPIRED') {
    return 'default'
  }

  return 'default'
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return (
    <Chip
      size={size}
      color={colorForStatus(status)}
      label={formatStatusLabel(status)}
      variant={colorForStatus(status) === 'default' ? 'outlined' : 'filled'}
      aria-label={`Status ${formatStatusLabel(status)}`}
    />
  )
}
