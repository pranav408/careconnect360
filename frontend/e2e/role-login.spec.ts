import { test } from '@playwright/test'
import {
  SUPPORTED_ROLES,
  assertApiRequestsUseSameOrigin,
  assertAuthenticatedAfterRefresh,
  assertRoleLandingUi,
  beginRequestRecording,
  loginAsRole,
} from './support/auth'

test.describe('role login smoke', () => {
  for (const role of SUPPORTED_ROLES) {
    test(`${role} can sign in, stay signed in after refresh, and use same-origin API routes`, async ({ page, baseURL }) => {
      const stopRecording = beginRequestRecording(page)

      await loginAsRole(page, role)
      await assertRoleLandingUi(page, role)
      await assertAuthenticatedAfterRefresh(page, role)

      const requests = stopRecording()
      assertApiRequestsUseSameOrigin(requests, baseURL)
    })
  }
})
