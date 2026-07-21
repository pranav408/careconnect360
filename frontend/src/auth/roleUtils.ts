import type { UserRole } from '../types/auth'

export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case 'PATIENT':
      return '/patient'
    case 'DOCTOR':
      return '/doctor'
    case 'ADMIN':
      return '/admin'
    default:
      return '/login'
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'PATIENT':
      return 'Patient'
    case 'DOCTOR':
      return 'Doctor'
    case 'ADMIN':
      return 'Admin'
    default:
      return role
  }
}

export function toDisplayName(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[._-]+/g, ' ').trim()
  if (!cleaned) {
    return 'Care User'
  }

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ')
}
