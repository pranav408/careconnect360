import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminDoctorManagementPage } from './AdminDoctorManagementPage'

const mockListAdminDoctors = vi.fn()
const mockGetAdminDoctorDetail = vi.fn()
const mockCreateAdminDoctor = vi.fn()

vi.mock('../../api/adminDoctorApi', () => ({
  listAdminDoctors: (...args: unknown[]) => mockListAdminDoctors(...args),
  getAdminDoctorDetail: (...args: unknown[]) => mockGetAdminDoctorDetail(...args),
  createAdminDoctor: (...args: unknown[]) => mockCreateAdminDoctor(...args),
}))

function doctorFixture(overrides: Record<string, unknown> = {}) {
  return {
    doctorId: 7,
    fullName: 'Dr. Priya Sharma',
    specialization: 'Cardiology',
    licenseNumber: 'LIC-1001',
    phone: '5551234567',
    clinicAddress: '100 Health Avenue',
    consultationFee: 150,
    availableForAppointments: true,
    ...overrides,
  }
}

function makePage(content: Array<Record<string, unknown>>, overrides: Record<string, unknown> = {}) {
  return {
    content,
    pageable: {
      pageNumber: 0,
      pageSize: 10,
      sort: { empty: false, sorted: true, unsorted: false },
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: content.length,
    totalPages: 1,
    last: true,
    size: 10,
    number: 0,
    sort: { empty: false, sorted: true, unsorted: false },
    first: true,
    numberOfElements: content.length,
    empty: content.length === 0,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDoctorManagementPage />
    </MemoryRouter>,
  )
}

describe('AdminDoctorManagementPage', () => {
  beforeEach(() => {
    mockListAdminDoctors.mockReset()
    mockGetAdminDoctorDetail.mockReset()
    mockCreateAdminDoctor.mockReset()
    mockGetAdminDoctorDetail.mockResolvedValue(doctorFixture())
  })

  it('renders doctors from backend with formatted fee and availability text', async () => {
    mockListAdminDoctors.mockResolvedValue(
      makePage([
        doctorFixture(),
        doctorFixture({ doctorId: 8, fullName: 'Dr. Adam Reed', availableForAppointments: false, consultationFee: 210 }),
      ]),
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Doctor Management' })).toBeInTheDocument()
    expect(screen.getByText('Dr. Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument()
    expect(screen.getByText('Availability: Available')).toBeInTheDocument()
    expect(screen.getByText('Availability: Unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('sends exact supported list query params', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByRole('heading', { name: 'Doctor Management' })

    await user.type(screen.getByLabelText('Doctor Name'), 'Priya')
    await user.type(screen.getByLabelText('Specialization'), 'Cardiology')
    await user.click(screen.getByLabelText('Availability'))
    await user.click(screen.getByRole('option', { name: 'Unavailable' }))
    await user.click(screen.getByLabelText('Page Size'))
    await user.click(screen.getByRole('option', { name: '20' }))
    await user.click(screen.getByLabelText('Sort'))
    await user.click(screen.getByRole('option', { name: 'Consultation fee highest' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockListAdminDoctors).toHaveBeenLastCalledWith({
        name: 'Priya',
        specialization: 'Cardiology',
        available: false,
        page: 0,
        size: 20,
        sort: 'consultationFee,desc',
      })
    })
  })

  it('shows initial loading state while first list request is pending', async () => {
    mockListAdminDoctors.mockImplementation(
      () =>
        new Promise(() => {
          return undefined
        }),
    )

    renderPage()

    expect(screen.getByLabelText('Loading doctor management')).toBeInTheDocument()
  })

  it('renders empty states and clear filters action', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors.mockResolvedValue(makePage([]))

    renderPage()
    expect(await screen.findByText('No doctors in the directory')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Doctor Name'), 'Not Found Name')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No doctors match your filters')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Clear Filters' })[0])

    await waitFor(() => {
      expect(mockListAdminDoctors).toHaveBeenLastCalledWith({
        page: 0,
        size: 10,
        sort: 'fullName,asc',
      })
    })
  })

  it('renders retryable list error state', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors
      .mockResolvedValueOnce(makePage([doctorFixture()]))
      .mockRejectedValueOnce({ isAxiosError: true, message: 'Network Error' })
      .mockResolvedValueOnce(makePage([doctorFixture()]))

    renderPage()
    await screen.findByRole('heading', { name: 'Doctor Management' })

    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => {
      expect(mockListAdminDoctors).toHaveBeenCalledTimes(3)
    })
  })

  it('opens review dialog and loads doctor detail endpoint', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors.mockResolvedValue(makePage([doctorFixture()]))
    mockGetAdminDoctorDetail.mockResolvedValue(doctorFixture({ clinicAddress: '200 Lake Road' }))

    renderPage()
    await screen.findByRole('heading', { name: 'Doctor Management' })

    await user.click(screen.getAllByRole('button', { name: 'Review' })[0])

    expect(await screen.findByRole('dialog', { name: 'Doctor Review' })).toBeInTheDocument()
    await waitFor(() => {
      expect(mockGetAdminDoctorDetail).toHaveBeenCalledWith(7)
    })
    expect(screen.getByText('Clinic Address: 200 Lake Road')).toBeInTheDocument()
  })

  it('create dialog validates and blocks invalid submissions', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors.mockResolvedValue(makePage([]))

    renderPage()
    await screen.findByRole('heading', { name: 'Doctor Management' })

    await user.click(screen.getByRole('button', { name: 'Add Doctor' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Doctor' })

    await user.click(within(dialog).getByRole('button', { name: 'Create Doctor' }))

    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(mockCreateAdminDoctor).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText('Consultation Fee'), '-5')
    await user.click(within(dialog).getByRole('button', { name: 'Create Doctor' }))
    expect(await screen.findByText('Consultation fee cannot be negative.')).toBeInTheDocument()
    expect(mockCreateAdminDoctor).not.toHaveBeenCalled()
  })

  it('submits exact create payload and prevents duplicate submission', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors
      .mockResolvedValueOnce(makePage([]))
      .mockResolvedValueOnce(makePage([doctorFixture({ doctorId: 99, fullName: 'Dr. New User' })]))

    let resolveCreate: (value: Record<string, unknown>) => void = () => {
      throw new Error('create resolver not initialized')
    }

    const createPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveCreate = resolve
    })

    mockCreateAdminDoctor.mockImplementation(() => createPromise)

    const createdResponse = {
      doctorId: 99,
      userId: 44,
      email: 'newdoctor@example.com',
      fullName: 'Dr. New User',
      specialization: 'Cardiology',
      licenseNumber: 'LIC-999',
      phone: '5551234567',
      clinicAddress: '300 Metro Ave',
      consultationFee: 175.5,
      availableForAppointments: true,
      role: 'DOCTOR',
      status: 'ACTIVE',
      message: 'Doctor account created successfully',
    }

    try {
      renderPage()
      await screen.findByRole('heading', { name: 'Doctor Management' })

      await user.click(screen.getByRole('button', { name: 'Add Doctor' }))
      const dialog = await screen.findByRole('dialog', { name: 'Add Doctor' })
      await user.type(within(dialog).getByLabelText('Email'), '  NewDoctor@Example.com  ')
      await user.type(within(dialog).getByLabelText('Password'), 'SecurePass123!')
      await user.type(within(dialog).getByLabelText('Doctor Name'), '  Dr. New User  ')
      await user.type(within(dialog).getByLabelText('Specialization'), ' Cardiology ')
      await user.type(within(dialog).getByLabelText('License Number'), ' LIC-999 ')
      await user.type(within(dialog).getByLabelText('Phone'), ' 5551234567 ')
      await user.type(within(dialog).getByLabelText('Clinic Address'), ' 300 Metro Ave ')
      await user.type(within(dialog).getByLabelText('Consultation Fee'), '175.50')

      const submitButton = within(dialog).getByRole('button', { name: 'Create Doctor' })
      await user.click(submitButton)
      fireEvent.click(submitButton)

      expect(mockCreateAdminDoctor).toHaveBeenCalledTimes(1)
      expect(mockCreateAdminDoctor).toHaveBeenCalledWith({
        email: 'newdoctor@example.com',
        password: 'SecurePass123!',
        fullName: 'Dr. New User',
        specialization: 'Cardiology',
        licenseNumber: 'LIC-999',
        phone: '5551234567',
        clinicAddress: '300 Metro Ave',
        consultationFee: 175.5,
      })

      resolveCreate(createdResponse)

      expect(await screen.findByText('Doctor account created successfully')).toBeInTheDocument()
      await waitFor(() => {
        expect(mockListAdminDoctors.mock.calls.length).toBeGreaterThanOrEqual(2)
      })

      expect(document.body.textContent).not.toContain('SecurePass123!')
    } finally {
      resolveCreate(createdResponse)
    }
  })

  it('keeps create form values on duplicate email 409', async () => {
    const user = userEvent.setup()
    mockListAdminDoctors.mockResolvedValue(makePage([]))
    mockCreateAdminDoctor.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          timestamp: '2026-07-20T10:00:00Z',
          status: 409,
          error: 'Conflict',
          message: 'An account already exists with this email',
          path: '/api/admin/doctors',
        },
      },
    })

    renderPage()
    await screen.findByRole('heading', { name: 'Doctor Management' })

    await user.click(screen.getByRole('button', { name: 'Add Doctor' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Doctor' })
    await user.type(within(dialog).getByLabelText('Email'), 'doctor@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'SecurePass123!')
    await user.type(within(dialog).getByLabelText('Doctor Name'), 'Dr. Duplicate')
    await user.type(within(dialog).getByLabelText('Specialization'), 'Cardiology')
    await user.type(within(dialog).getByLabelText('License Number'), 'LIC-DUP')
    await user.type(within(dialog).getByLabelText('Phone'), '5551234567')
    await user.type(within(dialog).getByLabelText('Consultation Fee'), '120')

    await user.click(within(dialog).getByRole('button', { name: 'Create Doctor' }))

    expect(await screen.findByText('An account already exists with this email')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Doctor Name')).toHaveValue('Dr. Duplicate')
    expect(within(dialog).getByLabelText('Email')).toHaveValue('doctor@example.com')
  })

  it('does not render sensitive token or hash data', async () => {
    localStorage.setItem('careconnect360.auth.token', 'super-secret-jwt')

    mockListAdminDoctors.mockResolvedValue(
      makePage([
        doctorFixture({
          password: 'secret',
          passwordHash: 'hash-value',
          jwt: 'raw-jwt-token',
        }),
      ]),
    )

    renderPage()

    await screen.findByRole('heading', { name: 'Doctor Management' })
    expect(document.body.textContent).not.toContain('super-secret-jwt')
    expect(document.body.textContent).not.toContain('hash-value')
    expect(document.body.textContent).not.toContain('raw-jwt-token')
  })
})
