import { expect, test } from '@playwright/test'

test('public health endpoint and login form are available', async ({ page, request }) => {
  const response = await request.get('/api/public/health')

  expect(response.status()).toBe(200)

  const body = (await response.json()) as { status?: string }
  expect(body.status).toBe('UP')

  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
