import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { RoleRoute } from '../auth/RoleRoute'
import { getRoleHomePath } from '../auth/roleUtils'
import { AppShell } from '../components/layout/AppShell'
import { EmptyState } from '../components/common/EmptyState'
import { FullScreenLoading } from '../components/common/FullScreenLoading'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { PatientDashboardPage } from '../pages/patient/PatientDashboardPage'
import { PatientDoctorDirectoryPage } from '../pages/patient/PatientDoctorDirectoryPage'
import { PatientDoctorDetailPage } from '../pages/patient/PatientDoctorDetailPage'
import { PatientAppointmentsPage } from '../pages/patient/PatientAppointmentsPage'
import { PatientInsurancePage } from '../pages/patient/PatientInsurancePage'
import { PatientClaimsPage } from '../pages/patient/PatientClaimsPage'
import { PatientPaymentsPage } from '../pages/patient/PatientPaymentsPage'
import { PatientNotificationsPage } from '../pages/patient/PatientNotificationsPage'
import { PatientProfilePage } from '../pages/patient/PatientProfilePage'
import { DoctorOverviewPage } from '../pages/doctor/DoctorOverviewPage'
import { DoctorAppointmentsPage } from '../pages/doctor/DoctorAppointmentsPage'
import { DoctorProfilePage } from '../pages/doctor/DoctorProfilePage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminDoctorManagementPage } from '../pages/admin/AdminDoctorManagementPage'
import { AdminInsuranceManagementPage } from '../pages/admin/AdminInsuranceManagementPage'
import { AdminClaimManagementPage } from '../pages/admin/AdminClaimManagementPage'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'
import { NotFoundPage } from '../pages/NotFoundPage'

function RootRedirect() {
  const { user, isAuthenticated, isRestoringSession } = useAuth()

  if (isRestoringSession) {
    return <FullScreenLoading message="Loading your workspace..." />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />
}

function GuestRoute() {
  const { user, isAuthenticated, isRestoringSession } = useAuth()

  if (isRestoringSession) {
    return <FullScreenLoading message="Checking your secure session..." />
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  return <Outlet />
}

function ComingSoonPage({ title }: { title: string }) {
  return (
    <EmptyState
      title={`${title} coming soon`}
      description="This section is intentionally held for the next milestone while the authentication foundation is finalized."
    />
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['PATIENT']} />}>
          <Route path="/patient" element={<AppShell />}>
            <Route index element={<PatientDashboardPage />} />
            <Route path="find-doctors" element={<Navigate to="/patient/doctors" replace />} />
            <Route path="doctors" element={<PatientDoctorDirectoryPage />} />
            <Route path="doctors/:doctorId" element={<PatientDoctorDetailPage />} />
            <Route path="appointments" element={<PatientAppointmentsPage />} />
            <Route path="insurance" element={<PatientInsurancePage />} />
            <Route path="claims" element={<PatientClaimsPage />} />
            <Route path="payments" element={<PatientPaymentsPage />} />
            <Route path="notifications" element={<PatientNotificationsPage />} />
            <Route path="profile" element={<PatientProfilePage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={['DOCTOR']} />}>
          <Route path="/doctor" element={<AppShell />}>
            <Route index element={<DoctorOverviewPage />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
            <Route path="profile" element={<DoctorProfilePage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AppShell />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="doctors" element={<AdminDoctorManagementPage />} />
            <Route path="insurance" element={<AdminInsuranceManagementPage />} />
            <Route path="claims" element={<AdminClaimManagementPage />} />
            <Route path="system" element={<ComingSoonPage title="System" />} />
            <Route path="profile" element={<ComingSoonPage title="Admin Profile" />} />
          </Route>
        </Route>
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
