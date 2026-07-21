import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import { Box, Stack, Typography } from '@mui/material'

interface BrandLogoProps {
  compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: compact ? 34 : 42,
          height: compact ? 34 : 42,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: '0 8px 18px rgba(15, 118, 110, 0.24)',
        }}
      >
        <LocalHospitalRoundedIcon fontSize={compact ? 'small' : 'medium'} />
      </Box>
      {!compact ? (
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
            CareConnect 360
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
            Connected healthcare, simplified
          </Typography>
        </Box>
      ) : null}
    </Stack>
  )
}
