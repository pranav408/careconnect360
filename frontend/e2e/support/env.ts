const DEFAULT_BASE_URL = 'http://localhost:8088'

export type RequiredEnvName =
  | 'E2E_PATIENT_EMAIL'
  | 'E2E_PATIENT_PASSWORD'
  | 'E2E_DOCTOR_EMAIL'
  | 'E2E_DOCTOR_PASSWORD'
  | 'E2E_ADMIN_EMAIL'
  | 'E2E_ADMIN_PASSWORD'

export function getBaseUrl(): string {
  return process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL
}

export function requiredEnv(name: RequiredEnvName): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`)
  }

  return value
}
