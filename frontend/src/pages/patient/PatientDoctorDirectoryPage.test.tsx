import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientDoctorDirectoryPage } from './PatientDoctorDirectoryPage'

const mockGetDoctors = vi.fn()

vi.mock('../../api/doctorApi', () => ({
  getDoctors: (...args: unknown[]) => mockGetDoctors(...args),
}))

describe('PatientDoctorDirectoryPage', () => {
  beforeEach(() => {
    mockGetDoctors.mockReset()
  })

  it('renders doctor list data from backend response', async () => {
    mockGetDoctors.mockResolvedValue({
      content: [
        {
          doctorId: 1,
          fullName: 'Dr. Alpha',
          specialization: 'Cardiology',
          licenseNumber: 'LIC-1',
          phone: '5551234567',
          clinicAddress: '100 Health Avenue',
          consultationFee: 150,
          availableForAppointments: true,
        },
      ],
      totalPages: 1,
    })

    render(
      <MemoryRouter>
        <PatientDoctorDirectoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Dr. Alpha')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
  })

  it('sends expected filter parameter names and values', async () => {
    const user = userEvent.setup()
    mockGetDoctors.mockResolvedValue({ content: [], totalPages: 1 })

    render(
      <MemoryRouter>
        <PatientDoctorDirectoryPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockGetDoctors).toHaveBeenCalled()
    })

    await user.type(screen.getAllByLabelText('Doctor Name')[0], 'ali')
    await user.type(screen.getAllByLabelText('Specialization')[0], 'card')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockGetDoctors).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'ali',
          specialization: 'card',
          available: true,
        }),
      )
    })
  })

  it('shows no-results empty state', async () => {
    mockGetDoctors.mockResolvedValue({ content: [], totalPages: 1 })

    render(
      <MemoryRouter>
        <PatientDoctorDirectoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No doctors match your filters')).toBeInTheDocument()
  })
})
