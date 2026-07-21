import WrongLocationRoundedIcon from '@mui/icons-material/WrongLocationRounded'
import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ py: 4 }}>
      <EmptyState
        icon={<WrongLocationRoundedIcon />}
        title="Page not found"
        description="The page you requested does not exist or may have moved."
        actionLabel="Go to login"
        onAction={() => navigate('/login', { replace: true })}
      />
    </Box>
  )
}
