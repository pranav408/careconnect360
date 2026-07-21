import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientProfilePage } from './PatientProfilePage'
import type { PatientProfileResponse } from '../../types/patient'

const mockGetMyPatientProfile = vi.fn()
const mockUpdateMyPatientProfile = vi.fn()

vi.mock('../../api/patientProfileApi', () => ({
  getMyPatientProfile: (...args: unknown[]) => mockGetMyPatientProfile(...args),
  updateMyPatientProfile: (...args: unknown[]) => mockUpdateMyPatientProfile(...args),
}))

function profileFixture(overrides: Partial<PatientProfileResponse> = {}): PatientProfileResponse {
  return {
    patientId: 11,
    email: 'patient@example.com',
    fullName: 'Example Patient',
    phone: '5551234567',
    address: '100 Main Street',
    dateOfBirth: '1990-01-15',
    gender: 'FEMALE',
    accountStatus: 'ACTIVE',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PatientProfilePage />
    </MemoryRouter>,
  )
}

describe('PatientProfilePage', () => {
  beforeEach(() => {
    mockGetMyPatientProfile.mockReset()
    mockUpdateMyPatientProfile.mockReset()
  })

  it('renders backend profile fields and ignores sensitive or entity-shaped extras', async () => {
    mockGetMyPatientProfile.mockResolvedValue(
      profileFixture({
        email: 'patient@example.com',
        fullName: 'Example Patient',
      }) as PatientProfileResponse & {
        password?: string
        passwordHash?: string
        user?: Record<string, unknown>
        accessToken?: string
      },
    )

    renderPage()

    expect(await screen.findByRole('button', { name: 'Edit Profile' })).toBeInTheDocument()
    expect(screen.getByText('Example Patient')).toBeInTheDocument()
    expect(screen.getByText('5551234567')).toBeInTheDocument()
    expect(screen.getByText('100 Main Street')).toBeInTheDocument()
    expect(screen.getByText('1990-01-15')).toBeInTheDocument()
    expect(screen.getAllByText('Female').length).toBeGreaterThan(0)
    expect(screen.getByText('patient@example.com')).toBeInTheDocument()
    expect(screen.queryByText(/passwordHash/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accessToken/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument()
  })

  it('opens edit mode with existing profile values', async () => {
    const user = userEvent.setup()
    mockGetMyPatientProfile.mockResolvedValue(profileFixture())

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Profile' }))

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toHaveValue('Example Patient')
    expect(screen.getByLabelText('Phone')).toHaveValue('5551234567')
  })

  it('prevents invalid submission on the client and does not call update', async () => {
    const user = userEvent.setup()
    mockGetMyPatientProfile.mockResolvedValue(profileFixture())

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Profile' }))
    await user.clear(screen.getByLabelText('Full Name'))
    await user.clear(screen.getByLabelText('Phone'))
    await user.type(screen.getByLabelText('Phone'), '123')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByText('Phone number must contain between 7 and 20 characters.')).toBeInTheDocument()
    expect(mockUpdateMyPatientProfile).not.toHaveBeenCalled()
  })

  it('keeps dates in YYYY-MM-DD format and refreshes the view after a successful update', async () => {
    const user = userEvent.setup()
    mockGetMyPatientProfile.mockResolvedValue(profileFixture())
    mockUpdateMyPatientProfile.mockResolvedValue(
      profileFixture({
        fullName: 'Updated Patient',
        phone: '5552222222',
        address: '200 Oak Avenue',
        dateOfBirth: '1991-02-20',
        gender: 'OTHER',
      }),
    )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: ' Updated Patient ' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: ' 5552222222 ' } })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: ' 200 Oak Avenue ' } })
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '1991-02-20' } })
    await user.click(screen.getByLabelText('Gender'))
    await user.click(screen.getByRole('option', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockUpdateMyPatientProfile).toHaveBeenCalledWith({
        fullName: 'Updated Patient',
        phone: '5552222222',
        address: '200 Oak Avenue',
        dateOfBirth: '1991-02-20',
        gender: 'OTHER',
      })
    })

    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(screen.getByText('Updated Patient')).toBeInTheDocument()
    expect(screen.getByText('5552222222')).toBeInTheDocument()
    expect(screen.getByText('200 Oak Avenue')).toBeInTheDocument()
    expect(screen.getByText('1991-02-20')).toBeInTheDocument()
    expect(screen.getAllByText('Other').length).toBeGreaterThan(0)
  })

  it('preserves entered values after a failed update', async () => {
    const user = userEvent.setup()
    mockGetMyPatientProfile.mockResolvedValue(profileFixture())
    mockUpdateMyPatientProfile.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          timestamp: '2026-07-14T12:00:00',
          status: 400,
          error: 'Bad Request',
          message: 'Please review the submitted profile details.',
          path: '/api/patients/me',
        },
      },
    })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Profile' }))
    await user.clear(screen.getByLabelText('Full Name'))
    await user.type(screen.getByLabelText('Full Name'), 'Retry Patient')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Please review the submitted profile details.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toHaveValue('Retry Patient')
  })

  it('shows a loading skeleton while the initial profile request is pending', () => {
    mockGetMyPatientProfile.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    expect(screen.getByRole('status', { name: 'Loading your profile' })).toBeInTheDocument()
  })

  it('shows an empty state when the backend reports a missing patient profile', async () => {
    mockGetMyPatientProfile.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
      },
    })

    renderPage()

    expect(await screen.findByText('Profile not found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('shows a retryable error state for server failures', async () => {
    mockGetMyPatientProfile.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 500,
      },
    })

    renderPage()

    expect(await screen.findByText('Profile service unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })
})