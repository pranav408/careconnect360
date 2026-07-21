import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DoctorProfilePage } from './DoctorProfilePage'
import type { DoctorProfileResponse } from '../../types/doctorProfile'

const mockGetMyDoctorProfile = vi.fn()
const mockUpdateMyDoctorProfile = vi.fn()

vi.mock('../../api/doctorProfileApi', () => ({
  getMyDoctorProfile: (...args: unknown[]) => mockGetMyDoctorProfile(...args),
  updateMyDoctorProfile: (...args: unknown[]) => mockUpdateMyDoctorProfile(...args),
}))

function profileFixture(overrides: Partial<DoctorProfileResponse> = {}): DoctorProfileResponse {
  return {
    doctorId: 31,
    email: 'doctor@example.com',
    fullName: 'Dr. Ada Lovelace',
    specialization: 'Cardiology',
    phone: '5551234567',
    consultationFee: 150,
    available: true,
    accountStatus: 'ACTIVE',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DoctorProfilePage />
    </MemoryRouter>,
  )
}

describe('DoctorProfilePage', () => {
  beforeEach(() => {
    mockGetMyDoctorProfile.mockReset()
    mockUpdateMyDoctorProfile.mockReset()
  })

  it('renders professional profile fields and keeps email/status read-only', async () => {
    mockGetMyDoctorProfile.mockResolvedValue(
      profileFixture() as DoctorProfileResponse & {
        password?: string
        passwordHash?: string
        accessToken?: string
        user?: Record<string, unknown>
      },
    )

    renderPage()

    expect(await screen.findByText('Dr. Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
    expect(screen.getByText('5551234567')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('doctor@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Account Email' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Account Status' })).not.toBeInTheDocument()
    expect(screen.queryByText(/passwordHash/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accessToken/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument()
  })

  it('calls the exact authenticated doctor endpoint on load', async () => {
    mockGetMyDoctorProfile.mockResolvedValue(profileFixture())

    renderPage()

    await screen.findByText('Dr. Ada Lovelace')
    expect(mockGetMyDoctorProfile).toHaveBeenCalledTimes(1)
    expect(mockGetMyDoctorProfile).toHaveBeenCalledWith()
  })

  it('supports edit mode and submits exact PUT payload without ownership fields', async () => {
    const user = userEvent.setup()
    mockGetMyDoctorProfile.mockResolvedValue(profileFixture())
    mockUpdateMyDoctorProfile.mockResolvedValue(
      profileFixture({
        fullName: 'Dr. Updated Name',
        specialization: 'Neurology',
        phone: '5550001111',
        consultationFee: 220,
      }),
    )

    renderPage()

    await screen.findByText('Dr. Ada Lovelace')
    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))

    const fullName = screen.getByLabelText('Full Name')
    const specialization = screen.getByLabelText('Specialization')
    const phone = screen.getByLabelText('Phone')
    const consultationFee = screen.getByLabelText('Consultation Fee')

    fireEvent.change(fullName, { target: { value: '  Dr. Updated Name  ' } })
    fireEvent.change(specialization, { target: { value: '  Neurology  ' } })
    fireEvent.change(phone, { target: { value: ' 5550001111 ' } })
    fireEvent.change(consultationFee, { target: { value: '220' } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockUpdateMyDoctorProfile).toHaveBeenCalledTimes(1)
      const payload = mockUpdateMyDoctorProfile.mock.calls[0]?.[0] as Record<string, unknown>
      expect(payload).toEqual({
        fullName: 'Dr. Updated Name',
        specialization: 'Neurology',
        phone: '5550001111',
        consultationFee: 220,
        available: true,
      })
      expect(payload.doctorId).toBeUndefined()
      expect(payload.userId).toBeUndefined()
      expect(payload.email).toBeUndefined()
      expect(payload.role).toBeUndefined()
      expect(payload.accountStatus).toBeUndefined()
    })

    expect(await screen.findByText('Dr. Updated Name')).toBeInTheDocument()
  })

  it('rejects negative consultation fee in client validation', async () => {
    const user = userEvent.setup()
    mockGetMyDoctorProfile.mockResolvedValue(profileFixture())

    renderPage()

    await screen.findByText('Dr. Ada Lovelace')
    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))

    const consultationFee = screen.getByLabelText('Consultation Fee')
    fireEvent.change(consultationFee, { target: { value: '-1' } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Consultation fee cannot be negative.')).toBeInTheDocument()
    expect(mockUpdateMyDoctorProfile).not.toHaveBeenCalled()
  })

  it('refreshes the rendered view after successful update', async () => {
    const user = userEvent.setup()
    mockGetMyDoctorProfile.mockResolvedValue(profileFixture())
    mockUpdateMyDoctorProfile.mockResolvedValue(
      profileFixture({
        fullName: 'Dr. Grace Hopper',
        consultationFee: 300,
        available: false,
      }),
    )

    renderPage()

    await screen.findByText('Dr. Ada Lovelace')
    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Dr. Grace Hopper' } })
    fireEvent.change(screen.getByLabelText('Consultation Fee'), { target: { value: '300' } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(screen.getByText('Dr. Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('$300.00')).toBeInTheDocument()
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  it('preserves edited values after failed update', async () => {
    const user = userEvent.setup()
    mockGetMyDoctorProfile.mockResolvedValue(profileFixture())
    mockUpdateMyDoctorProfile.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 500,
      },
      message: 'Request failed',
    })

    renderPage()

    await screen.findByText('Dr. Ada Lovelace')
    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5559990000' } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveValue('5559990000')
  })

  it('prevents duplicate submissions while update is pending', async () => {
    const user = userEvent.setup()
    mockGetMyDoctorProfile.mockResolvedValue(profileFixture())
    mockUpdateMyDoctorProfile.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    await screen.findByText('Dr. Ada Lovelace')
    await user.click(screen.getByRole('button', { name: 'Edit Profile' }))

    const saveButton = screen.getByRole('button', { name: 'Save Changes' })
    await user.click(saveButton)

    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled()

    await waitFor(() => {
      expect(mockUpdateMyDoctorProfile).toHaveBeenCalledTimes(1)
    })
  })

  it('shows loading skeleton while profile request is pending', () => {
    mockGetMyDoctorProfile.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    expect(screen.getByRole('status', { name: 'Loading your doctor profile' })).toBeInTheDocument()
  })

  it('shows retryable error state for server failures', async () => {
    mockGetMyDoctorProfile.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 500,
      },
    })

    renderPage()

    expect(await screen.findByText('Profile service unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('shows missing-profile empty state for 404 responses', async () => {
    mockGetMyDoctorProfile.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
      },
    })

    renderPage()

    expect(await screen.findByText('Profile not found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })
})