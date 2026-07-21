import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'

export function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ py: 4 }}>
      <EmptyState
        icon={<BlockRoundedIcon />}
        title="Unauthorized access"
        description="Your account does not have permission to access this route."
        actionLabel="Return to sign in"
        onAction={() => navigate('/login', { replace: true })}
      />
    </Box>
  )
}
