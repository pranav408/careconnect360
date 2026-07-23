import { expect, type Page } from '@playwright/test'
import { getBaseUrl, requiredEnv, type RequiredEnvName } from './env'

export type SupportedRole = 'PATIENT' | 'DOCTOR' | 'ADMIN'

interface RoleConfig {
  landingRoute: '/patient' | '/doctor' | '/admin'
  emailEnv: RequiredEnvName
  passwordEnv: RequiredEnvName
}

interface RoleCredentials {
  email: string
  password: string
}

interface RecordedRequest {
  method: string
  url: string
}

const ROLE_CONFIG: Record<SupportedRole, RoleConfig> = {
  PATIENT: {
    landingRoute: '/patient',
    emailEnv: 'E2E_PATIENT_EMAIL',
    passwordEnv: 'E2E_PATIENT_PASSWORD',
  },
  DOCTOR: {
    landingRoute: '/doctor',
    emailEnv: 'E2E_DOCTOR_EMAIL',
    passwordEnv: 'E2E_DOCTOR_PASSWORD',
  },
  ADMIN: {
    landingRoute: '/admin',
    emailEnv: 'E2E_ADMIN_EMAIL',
    passwordEnv: 'E2E_ADMIN_PASSWORD',
  },
}

export const SUPPORTED_ROLES: SupportedRole[] = ['PATIENT', 'DOCTOR', 'ADMIN']

export function getLandingRoute(role: SupportedRole): string {
  return ROLE_CONFIG[role].landingRoute
}

export function getRoleCredentials(role: SupportedRole): RoleCredentials {
  const config = ROLE_CONFIG[role]

  return {
    email: requiredEnv(config.emailEnv),
    password: requiredEnv(config.passwordEnv),
  }
}

export function beginRequestRecording(page: Page): () => RecordedRequest[] {
  const requests: RecordedRequest[] = []
  const handler = (request: { method(): string; url(): string }) => {
    requests.push({
      method: request.method(),
      url: request.url(),
    })
  }

  page.on('request', handler)

  return () => {
    page.off('request', handler)
    return requests
  }
}

export async function loginAsRole(page: Page, role: SupportedRole): Promise<void> {
  const credentials = getRoleCredentials(role)

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(new RegExp(`${getLandingRoute(role)}(?:$|[/?#])`))
}

export async function assertRoleLandingUi(page: Page, role: SupportedRole): Promise<void> {
  if (role === 'PATIENT') {
    await expect(page.getByRole('link', { name: 'Find Doctors' })).toBeVisible()
    return
  }

  if (role === 'DOCTOR') {
    await expect(page.getByRole('heading', { name: 'Doctor Workspace' })).toBeVisible()
    return
  }

  await expect(page.getByRole('link', { name: 'System' })).toBeVisible()
}

export async function assertAuthenticatedAfterRefresh(page: Page, role: SupportedRole): Promise<void> {
  await page.reload()
  await expect(page).toHaveURL(new RegExp(`${getLandingRoute(role)}(?:$|[/?#])`))
  await assertRoleLandingUi(page, role)
}

export function assertApiRequestsUseSameOrigin(requests: RecordedRequest[], baseUrl?: string): void {
  const expectedOrigin = new URL(baseUrl ?? getBaseUrl()).origin
  const apiRequests = requests
    .map((record) => ({
      ...record,
      parsed: new URL(record.url),
    }))
    .filter((record) => record.parsed.pathname.startsWith('/api/'))

  expect(apiRequests.length).toBeGreaterThan(0)

  for (const request of apiRequests) {
    expect(request.parsed.origin, `${request.method} ${request.url}`).toBe(expectedOrigin)
    expect(request.parsed.pathname, `${request.method} ${request.url}`).toMatch(/^\/api\//)
    expect(request.url, `${request.method} ${request.url}`).not.toContain('localhost:8080')
  }
}
