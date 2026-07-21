import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getDoctorById, getDoctors } from './doctorApi'

const mockGet = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

describe('doctorApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('sends doctor filters with exact backend parameter names', async () => {
    mockGet.mockResolvedValue({ data: { content: [] } })

    await getDoctors({
      name: 'ali',
      specialization: 'card',
      available: true,
      page: 0,
      size: 6,
      sort: 'fullName,asc',
    })

    expect(mockGet).toHaveBeenCalledWith('/doctors', {
      params: {
        name: 'ali',
        specialization: 'card',
        available: true,
        page: 0,
        size: 6,
        sort: 'fullName,asc',
      },
    })
  })

  it('requests doctor detail by doctor id', async () => {
    mockGet.mockResolvedValue({ data: { doctorId: 7 } })

    await getDoctorById(7)

    expect(mockGet).toHaveBeenCalledWith('/doctors/7')
  })
})
