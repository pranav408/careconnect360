import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded'
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded'
import { Box, Container, useMediaQuery, useTheme } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getMyUnreadNotificationCount } from '../../api/patientNotificationApi'
import { useAuth } from '../../auth/useAuth'
import { ShellNotificationProvider } from './ShellNotificationContext'
import { Sidebar, type NavItem } from './Sidebar'
import { Topbar } from './Topbar'

const DESKTOP_SIDEBAR_EXPANDED_WIDTH = 272
const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 76
const MOBILE_SIDEBAR_WIDTH = 272
const DESKTOP_NAV_PREF_KEY = 'cc360.desktopNavCollapsed'

export function AppShell() {
  const { user, logout } = useAuth()
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(DESKTOP_NAV_PREF_KEY) === 'true'
  })
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number | null>(null)
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const location = useLocation()

  const refreshUnreadNotificationCount = useCallback(async (): Promise<number | null> => {
    if (!user || user.role !== 'PATIENT') {
      setUnreadNotificationCount(null)
      return null
    }

    try {
      const response = await getMyUnreadNotificationCount()
      setUnreadNotificationCount(response.unreadCount)
      return response.unreadCount
    } catch {
      setUnreadNotificationCount(null)
      return null
    }
  }, [user])

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_NAV_PREF_KEY, String(desktopCollapsed))
  }, [desktopCollapsed])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshUnreadNotificationCount()
    })
  }, [location.pathname, refreshUnreadNotificationCount])

  const navItems = useMemo<NavItem[]>(() => {
    if (!user) {
      return []
    }

    if (user.role === 'PATIENT') {
      return [
        { label: 'Overview', path: '/patient', icon: <DashboardRoundedIcon /> },
        { label: 'Find Doctors', path: '/patient/doctors', icon: <SearchRoundedIcon /> },
        { label: 'Appointments', path: '/patient/appointments', icon: <EventAvailableRoundedIcon /> },
        { label: 'Insurance', path: '/patient/insurance', icon: <HealthAndSafetyRoundedIcon /> },
        { label: 'Claims', path: '/patient/claims', icon: <ReceiptLongRoundedIcon /> },
        { label: 'Payments', path: '/patient/payments', icon: <CreditCardRoundedIcon /> },
        { label: 'Notifications', path: '/patient/notifications', icon: <NotificationsRoundedIcon /> },
        { label: 'Profile', path: '/patient/profile', icon: <PersonRoundedIcon /> },
      ]
    }

    if (user.role === 'DOCTOR') {
      return [
        { label: 'Overview', path: '/doctor', icon: <DashboardRoundedIcon /> },
        { label: 'Appointments', path: '/doctor/appointments', icon: <EventAvailableRoundedIcon /> },
        { label: 'Profile', path: '/doctor/profile', icon: <PersonRoundedIcon /> },
      ]
    }

    return [
      { label: 'Overview', path: '/admin', icon: <DashboardRoundedIcon /> },
      { label: 'Doctors', path: '/admin/doctors', icon: <MedicalServicesRoundedIcon /> },
      { label: 'Insurance', path: '/admin/insurance', icon: <PolicyRoundedIcon /> },
      { label: 'Claims', path: '/admin/claims', icon: <ReceiptLongRoundedIcon /> },
      { label: 'System', path: '/admin/system', icon: <SettingsSuggestRoundedIcon /> },
      { label: 'Admin Profile', path: '/admin/profile', icon: <AdminPanelSettingsRoundedIcon /> },
    ]
  }, [user])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const notificationContextValue = {
    unreadNotificationCount,
    setUnreadNotificationCount,
    refreshUnreadNotificationCount,
  }

  return (
    <ShellNotificationProvider value={notificationContextValue}>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {isDesktop ? (
          <Sidebar
            items={navItems}
            open
            onClose={() => undefined}
            variant="permanent"
            width={desktopCollapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_EXPANDED_WIDTH}
            collapsed={desktopCollapsed}
          />
        ) : (
          <Sidebar
            key={location.pathname}
            items={navItems}
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            variant="temporary"
            width={MOBILE_SIDEBAR_WIDTH}
            collapsed={false}
          />
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar
            user={user}
            onOpenMobileNav={() => setMobileDrawerOpen(true)}
            onLogout={logout}
            showMobileMenuButton={!isDesktop}
            isDesktopNavCollapsed={desktopCollapsed}
            onToggleDesktopNav={() => setDesktopCollapsed((prev) => !prev)}
          />

          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Container
              maxWidth="xl"
              sx={{
                py: { xs: 2, sm: 3 },
                px: { xs: 1.5, sm: 3 },
              }}
            >
              <Outlet />
            </Container>
          </Box>
        </Box>
      </Box>
    </ShellNotificationProvider>
  )
}
