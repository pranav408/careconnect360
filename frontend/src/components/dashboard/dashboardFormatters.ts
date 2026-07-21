import { format } from 'date-fns'

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return 'N/A'
  }

  return usdFormatter.format(value)
}

export function formatLocalDate(localDate: string): string {
  const parts = localDate.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return localDate
  }

  const [year, month, day] = parts
  const safeDate = new Date(year, month - 1, day)
  return format(safeDate, 'MMM d, yyyy')
}

export function formatLocalDateTime(localDateTime: string | null): string {
  if (!localDateTime) {
    return 'N/A'
  }

  const normalized = localDateTime.replace('T', ' ')
  return normalized
}

export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
