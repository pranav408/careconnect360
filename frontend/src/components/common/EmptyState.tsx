import InboxRoundedIcon from '@mui/icons-material/InboxRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        py: 6,
        px: { xs: 2, sm: 4 },
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(15, 118, 110, 0.1)',
            color: 'primary.main',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon ?? <InboxRoundedIcon />}
        </Box>
        <Typography variant="h4">{title}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
          {description}
        </Typography>
        {actionLabel && onAction ? (
          <Button variant="outlined" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
