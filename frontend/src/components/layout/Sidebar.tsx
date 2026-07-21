import type { ReactNode } from 'react'
import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { NavLink } from 'react-router-dom'
import { BrandLogo } from '../common/BrandLogo'

export interface NavItem {
  label: string
  path: string
  icon: ReactNode
}

interface SidebarProps {
  items: NavItem[]
  open: boolean
  onClose: () => void
  variant: 'temporary' | 'permanent'
  width: number
  collapsed: boolean
}

export function Sidebar({ items, open, onClose, variant, width, collapsed }: SidebarProps) {
  const isDesktopCollapsed = variant === 'permanent' && collapsed

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: variant === 'permanent' ? width : undefined,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 100%)',
          px: isDesktopCollapsed ? 1 : 1.5,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: variant === 'permanent' ? 'relative' : undefined,
          height: variant === 'permanent' ? '100vh' : undefined,
          transition: (theme) =>
            theme.transitions.create(['width', 'padding'], {
              duration: theme.transitions.duration.shorter,
              easing: theme.transitions.easing.easeInOut,
            }),
        },
      }}
    >
      <Toolbar
        sx={{
          minHeight: 84,
          alignItems: 'center',
          justifyContent: isDesktopCollapsed ? 'center' : 'flex-start',
          px: 1,
        }}
      >
        <BrandLogo compact={isDesktopCollapsed} />
        {variant === 'temporary' ? (
          <IconButton onClick={onClose} aria-label="Close navigation" sx={{ ml: 'auto' }}>
            <CloseRoundedIcon />
          </IconButton>
        ) : null}
      </Toolbar>

      <List sx={{ px: isDesktopCollapsed ? 0.5 : 1, pb: 2 }}>
        {items.map((item) => (
          <Tooltip
            key={item.path}
            title={isDesktopCollapsed ? item.label : ''}
            placement="right"
            arrow
            disableHoverListener={!isDesktopCollapsed}
          >
            <ListItemButton
              component={NavLink}
              to={item.path}
              onClick={variant === 'temporary' ? onClose : undefined}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 46,
                px: isDesktopCollapsed ? 1 : 1.25,
                justifyContent: isDesktopCollapsed ? 'center' : 'flex-start',
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'inherit',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: isDesktopCollapsed ? 0 : 38,
                  color: 'text.secondary',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!isDesktopCollapsed ? <ListItemText primary={item.label} /> : null}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  )
}
