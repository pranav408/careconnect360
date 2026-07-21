import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { FullScreenLoading } from '../components/common/FullScreenLoading'

export function ProtectedRoute() {
  const { isAuthenticated, isRestoringSession } = useAuth()
  const location = useLocation()

  if (isRestoringSession) {
    return <FullScreenLoading message="Restoring your secure session..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
