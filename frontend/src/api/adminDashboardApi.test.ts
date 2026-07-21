import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminDashboard } from './adminDashboardApi'

const mockGet = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

describe('adminDashboardApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls the exact admin dashboard endpoint without invented params', async () => {
    mockGet.mockResolvedValue({
      data: {
        totalPatientCount: 0,
        totalDoctorCount: 0,
        availableDoctorCount: 0,
        totalAppointmentCount: 0,
        appointmentCounts: [],
        policyCounts: [],
        claimCounts: [],
        successfulPaymentCount: 0,
        failedPaymentCount: 0,
        totalSuccessfulPaymentAmount: 0,
        unreadNotificationCount: 0,
        recentAppointments: [],
        recentClaims: [],
        recentSuccessfulPayments: [],
        averageSettlementTime: 'UNSUPPORTED',
      },
    })

    await getAdminDashboard()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/admin')
  })
})