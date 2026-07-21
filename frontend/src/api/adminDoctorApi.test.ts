import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminDoctor, getAdminDoctorDetail, listAdminDoctors } from './adminDoctorApi'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

describe('adminDoctorApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('lists doctors with exact query parameters', async () => {
    mockGet.mockResolvedValue({ data: { content: [], totalElements: 0 } })

    await listAdminDoctors({
      name: 'Priya',
      specialization: 'Cardiology',
      available: true,
      page: 2,
      size: 20,
      sort: 'fullName,asc',
    })

    expect(mockGet).toHaveBeenCalledWith('/doctors', {
      params: {
        name: 'Priya',
        specialization: 'Cardiology',
        available: true,
        page: 2,
        size: 20,
        sort: 'fullName,asc',
      },
    })
  })

  it('loads one doctor with exact endpoint', async () => {
    mockGet.mockResolvedValue({ data: { doctorId: 15 } })

    await getAdminDoctorDetail(15)

    expect(mockGet).toHaveBeenCalledWith('/doctors/15')
  })

  it('creates doctor with exact endpoint and request payload', async () => {
    mockPost.mockResolvedValue({ data: { doctorId: 22, message: 'Doctor account created successfully' } })

    await createAdminDoctor({
      email: 'doctor@example.com',
      password: 'SecurePass123!',
      fullName: 'Dr. Priya Sharma',
      specialization: 'Cardiology',
      licenseNumber: 'LIC-999',
      phone: '5551234567',
      clinicAddress: '100 Health Avenue',
      consultationFee: 150,
    })

    expect(mockPost).toHaveBeenCalledWith('/admin/doctors', {
      email: 'doctor@example.com',
      password: 'SecurePass123!',
      fullName: 'Dr. Priya Sharma',
      specialization: 'Cardiology',
      licenseNumber: 'LIC-999',
      phone: '5551234567',
      clinicAddress: '100 Health Avenue',
      consultationFee: 150,
    })
    expect(mockPost.mock.calls[0]?.[1]).not.toHaveProperty('adminId')
    expect(mockPost.mock.calls[0]?.[1]).not.toHaveProperty('userId')
    expect(mockPost.mock.calls[0]?.[1]).not.toHaveProperty('role')
    expect(mockPost.mock.calls[0]?.[1]).not.toHaveProperty('accountStatus')
    expect(mockPost.mock.calls[0]?.[1]).not.toHaveProperty('passwordHash')
  })
})
