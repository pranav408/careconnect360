import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientInsurancePage } from './PatientInsurancePage'

const mockGetMyInsurancePolicies = vi.fn()
const mockGetMyActiveInsurancePolicy = vi.fn()
const mockSubmitInsurancePolicy = vi.fn()

vi.mock('../../api/insuranceApi', () => ({
  getMyInsurancePolicies: (...args: unknown[]) => mockGetMyInsurancePolicies(...args),
  getMyActiveInsurancePolicy: (...args: unknown[]) => mockGetMyActiveInsurancePolicy(...args),
  submitInsurancePolicy: (...args: unknown[]) => mockSubmitInsurancePolicy(...args),
}))

function policyFixture(overrides: Record<string, unknown> = {}) {
  return {
    policyId: 1,
    providerName: 'United Healthcare',
    policyNumber: 'CC360-POL-1001',
    coveragePercentage: 80,
    deductibleAmount: 500,
    startDate: '2027-01-01',
    endDate: '2027-12-31',
    status: 'ACTIVE',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PatientInsurancePage />
    </MemoryRouter>,
  )
}

async function openAddPolicyDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click((await screen.findAllByRole('button', { name: 'Add Insurance Policy' }))[0])
  await screen.findByRole('dialog', { name: 'Add Insurance Policy' })
}

describe('PatientInsurancePage', () => {
  beforeEach(() => {
    mockGetMyInsurancePolicies.mockReset()
    mockGetMyActiveInsurancePolicy.mockReset()
    mockSubmitInsurancePolicy.mockReset()
  })

  it('renders active policy details from backend', async () => {
    mockGetMyInsurancePolicies.mockResolvedValue([policyFixture()])
    mockGetMyActiveInsurancePolicy.mockResolvedValue(policyFixture())

    renderPage()

    expect((await screen.findAllByText('Active Policy')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('United Healthcare').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Policy CC360-POL-1001').length).toBeGreaterThan(0)
    expect(screen.getByText('Coverage: 80.00%')).toBeInTheDocument()
    expect(screen.getByText('Deductible: $500.00')).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
  })

  it('treats active-policy 404 as empty state instead of page error', async () => {
    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderPage()

    expect(await screen.findByText('No active insurance policy')).toBeInTheDocument()
    expect(screen.queryByText('Unable to load insurance policies')).not.toBeInTheDocument()
  })

  it('renders all policy list rows from backend data', async () => {
    mockGetMyInsurancePolicies.mockResolvedValue([
      policyFixture(),
      policyFixture({
        policyId: 2,
        providerName: 'Aetna',
        policyNumber: 'CC360-POL-2002',
        status: 'PENDING',
      }),
    ])
    mockGetMyActiveInsurancePolicy.mockResolvedValue(policyFixture())

    renderPage()

    expect(await screen.findByText('All Policies')).toBeInTheDocument()
    expect(screen.getByText('Aetna')).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.replace(/\s+/g, ' ').includes('CC360-POL-2002')),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('renders empty policy list state safely', async () => {
    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderPage()

    expect(await screen.findByText('No insurance policies submitted')).toBeInTheDocument()
  })

  it('opens add policy form and omits patientId/status fields', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderPage()

    await openAddPolicyDialog(user)

    expect(screen.getByRole('dialog', { name: 'Add Insurance Policy' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Patient ID')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
  })

  it('validates required fields and range/date rules', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderPage()

    await openAddPolicyDialog(user)
    await user.click(screen.getByRole('button', { name: 'Submit Policy' }))

    expect(await screen.findByText('Provider name is required.')).toBeInTheDocument()
    expect(screen.getByText('Policy number is required.')).toBeInTheDocument()
    expect(screen.getByText('Coverage percentage is required.')).toBeInTheDocument()
    expect(screen.getByText('Deductible amount is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Provider Name'), 'Aetna')
    await user.type(screen.getByLabelText('Policy Number'), 'CC360-POL-3003')
    await user.type(screen.getByLabelText('Coverage Percentage'), '-1')
    await user.type(screen.getByLabelText('Deductible Amount'), '-5')
    await user.type(screen.getByLabelText('Start Date'), '2028-01-01')
    await user.type(screen.getByLabelText('End Date'), '2028-01-01')
    await user.click(screen.getByRole('button', { name: 'Submit Policy' }))

    expect(await screen.findByText('Coverage percentage must be between 0 and 100.')).toBeInTheDocument()
    expect(screen.getByText('Deductible amount cannot be negative.')).toBeInTheDocument()
    expect(screen.getByText('End date must be after start date.')).toBeInTheDocument()
  })

  it('rejects coverage values above 100', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderPage()

    await openAddPolicyDialog(user)
    await user.type(screen.getByLabelText('Provider Name'), 'Aetna')
    await user.type(screen.getByLabelText('Policy Number'), 'CC360-POL-4004')
    await user.type(screen.getByLabelText('Coverage Percentage'), '120')
    await user.type(screen.getByLabelText('Deductible Amount'), '300')
    await user.type(screen.getByLabelText('Start Date'), '2027-08-01')
    await user.type(screen.getByLabelText('End Date'), '2028-07-31')
    await user.click(screen.getByRole('button', { name: 'Submit Policy' }))

    expect(await screen.findByText('Coverage percentage must be between 0 and 100.')).toBeInTheDocument()
  })

  it('submits exact backend payload fields and date format', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })
    mockSubmitInsurancePolicy.mockResolvedValue(policyFixture({ status: 'PENDING' }))

    renderPage()

    await openAddPolicyDialog(user)
    await user.type(screen.getByLabelText('Provider Name'), ' Aetna ')
    await user.type(screen.getByLabelText('Policy Number'), ' CC360-POL-FRONTEND-2001 ')
    await user.type(screen.getByLabelText('Coverage Percentage'), '75')
    await user.type(screen.getByLabelText('Deductible Amount'), '300')
    await user.type(screen.getByLabelText('Start Date'), '2027-08-01')
    await user.type(screen.getByLabelText('End Date'), '2028-07-31')
    await user.click(screen.getByRole('button', { name: 'Submit Policy' }))

    await waitFor(() => {
      expect(mockSubmitInsurancePolicy).toHaveBeenCalledWith({
        providerName: 'Aetna',
        policyNumber: 'CC360-POL-FRONTEND-2001',
        coveragePercentage: 75,
        deductibleAmount: 300,
        startDate: '2027-08-01',
        endDate: '2028-07-31',
      })
    })
  })

  it('shows pending policy and refreshes list after successful submission', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies
      .mockResolvedValueOnce([policyFixture()])
      .mockResolvedValueOnce([
        policyFixture(),
        policyFixture({
          policyId: 22,
          providerName: 'Aetna',
          policyNumber: 'CC360-POL-FRONTEND-2001',
          coveragePercentage: 75,
          deductibleAmount: 300,
          startDate: '2027-08-01',
          endDate: '2028-07-31',
          status: 'PENDING',
        }),
      ])

    mockGetMyActiveInsurancePolicy
      .mockResolvedValueOnce(policyFixture())
      .mockResolvedValueOnce(policyFixture())

    mockSubmitInsurancePolicy.mockResolvedValue(
      policyFixture({
        policyId: 22,
        providerName: 'Aetna',
        policyNumber: 'CC360-POL-FRONTEND-2001',
        coveragePercentage: 75,
        deductibleAmount: 300,
        startDate: '2027-08-01',
        endDate: '2028-07-31',
        status: 'PENDING',
      }),
    )

    renderPage()

    await openAddPolicyDialog(user)
    await user.type(screen.getByLabelText('Provider Name'), 'Aetna')
    await user.type(screen.getByLabelText('Policy Number'), 'CC360-POL-FRONTEND-2001')
    await user.type(screen.getByLabelText('Coverage Percentage'), '75')
    await user.type(screen.getByLabelText('Deductible Amount'), '300')
    await user.type(screen.getByLabelText('Start Date'), '2027-08-01')
    await user.type(screen.getByLabelText('End Date'), '2028-07-31')
    await user.click(screen.getByRole('button', { name: 'Submit Policy' }))

    expect(await screen.findByText('Insurance policy submitted for review.')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockGetMyInsurancePolicies).toHaveBeenCalledTimes(2)
    })
    expect(
      await screen.findByText((content) =>
        content.replace(/\s+/g, ' ').includes('CC360-POL-FRONTEND-2001'),
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
  })

  it('shows safe duplicate message for 409 response', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    mockSubmitInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          timestamp: '2026-07-14T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'A policy already exists with this policy number',
          path: '/api/insurance/policies',
        },
      },
    })

    renderPage()

    await openAddPolicyDialog(user)
    await user.type(screen.getByLabelText('Provider Name'), 'Aetna')
    await user.type(screen.getByLabelText('Policy Number'), 'CC360-POL-FRONTEND-2001')
    await user.type(screen.getByLabelText('Coverage Percentage'), '75')
    await user.type(screen.getByLabelText('Deductible Amount'), '300')
    await user.type(screen.getByLabelText('Start Date'), '2027-08-01')
    await user.type(screen.getByLabelText('End Date'), '2028-07-31')
    await user.click(screen.getByRole('button', { name: 'Submit Policy' }))

    expect(await screen.findByText('A policy already exists with this policy number')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CC360-POL-FRONTEND-2001')).toBeInTheDocument()
  })

  it('prevents duplicate submit requests while processing', async () => {
    const user = userEvent.setup()

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    mockSubmitInsurancePolicy.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    await openAddPolicyDialog(user)
    await user.type(screen.getByLabelText('Provider Name'), 'Aetna')
    await user.type(screen.getByLabelText('Policy Number'), 'CC360-POL-FRONTEND-2001')
    await user.type(screen.getByLabelText('Coverage Percentage'), '75')
    await user.type(screen.getByLabelText('Deductible Amount'), '300')
    await user.type(screen.getByLabelText('Start Date'), '2027-08-01')
    await user.type(screen.getByLabelText('End Date'), '2028-07-31')

    const submitButton = screen.getByRole('button', { name: 'Submit Policy' })
    await user.click(submitButton)
    fireEvent.click(submitButton)

    expect(mockSubmitInsurancePolicy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled()
  })

  it('does not render JWT token values', async () => {
    localStorage.setItem('careconnect360.auth.token', 'jwt-sensitive-token')

    mockGetMyInsurancePolicies.mockResolvedValue([])
    mockGetMyActiveInsurancePolicy.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderPage()

    await screen.findByText('No insurance policies submitted')
    expect(document.body.textContent).not.toContain('jwt-sensitive-token')
  })
})
