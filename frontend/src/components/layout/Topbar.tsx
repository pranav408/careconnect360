import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '../../types/auth'
import { getRoleLabel } from '../../auth/roleUtils'
import { useShellNotifications } from './shellNotifications'

interface TopbarProps {
  user: AuthUser
  onOpenMobileNav: () => void
  onLogout: () => void
  showMobileMenuButton: boolean
  isDesktopNavCollapsed: boolean
  onToggleDesktopNav: () => void
}

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0]?.[0] ?? 'C'
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

export function Topbar({
  user,
  onOpenMobileNav,
  onLogout,
  showMobileMenuButton,
  isDesktopNavCollapsed,
  onToggleDesktopNav,
}: TopbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const { unreadNotificationCount } = useShellNotifications()

  const badgeValue =
    user.role === 'PATIENT' && unreadNotificationCount !== null
      ? unreadNotificationCount
      : undefined

  const notificationAriaLabel =
    user.role === 'PATIENT' && unreadNotificationCount !== null
      ? `${unreadNotificationCount} unread notifications`
      : 'Open notifications'

  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setAnchorEl(null)
  }

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
      }}
    >
      <Toolbar sx={{ minHeight: 72, px: { xs: 1.5, sm: 3 } }}>
        {showMobileMenuButton ? (
          <IconButton edge="start" onClick={onOpenMobileNav} aria-label="Open navigation">
            <MenuRoundedIcon />
          </IconButton>
        ) : (
          <IconButton
            edge="start"
            onClick={onToggleDesktopNav}
            aria-label={isDesktopNavCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {isDesktopNavCollapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
          </IconButton>
        )}

        {showMobileMenuButton ? (
          <Typography
            sx={{
              ml: 1,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              fontSize: { xs: 14, sm: 16 },
              whiteSpace: 'nowrap',
            }}
          >
            CareConnect 360
          </Typography>
        ) : null}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          {user.role === 'PATIENT' ? (
            <Tooltip title="Open notifications">
              <IconButton
                aria-label={notificationAriaLabel}
                onClick={() => {
                  void navigate('/patient/notifications')
                }}
              >
                <Badge color="error" badgeContent={badgeValue} showZero max={99}>
                  <NotificationsNoneRoundedIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          ) : null}

          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {user.displayName}
              </Typography>
              <Chip size="small" label={getRoleLabel(user.role)} color="secondary" />
            </Box>

            <IconButton onClick={handleOpenUserMenu} aria-label="Open user menu">
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                {initialsOf(user.displayName)}
              </Avatar>
            </IconButton>
          </Stack>
        </Stack>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseUserMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleCloseUserMenu} disabled>
            Signed in as {user.email}
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleCloseUserMenu()
              onLogout()
            }}
          >
            <LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
