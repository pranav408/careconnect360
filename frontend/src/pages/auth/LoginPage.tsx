import HealingRoundedIcon from '@mui/icons-material/HealingRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../components/common/BrandLogo'
import { ApiErrorAlert } from '../../components/common/ApiErrorAlert'
import { useAuth } from '../../auth/useAuth'
import { getRoleHomePath } from '../../auth/roleUtils'
import { getApiErrorMessage } from '../../api/apiClient'

interface LoginFormState {
  email: string
  password: string
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, isAuthenticated, user, isRestoringSession } = useAuth()

  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from
    ?.pathname

  const safeFrom =
    from && from !== '/login' && from !== '/register' && from !== '/unauthorized'
      ? from
      : null

  const validationError = useMemo(() => {
    if (!form.email.trim()) {
      return 'Email is required'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(form.email.trim())) {
      return 'Enter a valid email address'
    }

    if (!form.password) {
      return 'Password is required'
    }

    return null
  }, [form.email, form.password])

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  if (isRestoringSession) {
    return null
  }

  const handleChange = (key: keyof LoginFormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    if (errorMessage) {
      setErrorMessage(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const loggedInUser = await login({
        email: form.email.trim(),
        password: form.password,
      })
      navigate(safeFrom ?? getRoleHomePath(loggedInUser.role), { replace: true })
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch' }}>
      <Grid container sx={{ flexGrow: 1 }}>
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            display: { xs: 'none', md: 'flex' },
            p: { md: 5, lg: 8 },
            color: '#F3F8FF',
            background:
              'linear-gradient(145deg, #0F766E 0%, #1565C0 64%, #3F51B5 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 32,
              right: -70,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.11)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -60,
              left: -48,
              width: 210,
              height: 210,
              borderRadius: '28%',
              transform: 'rotate(25deg)',
              background: 'rgba(255,255,255,0.09)',
            }}
          />

          <Stack spacing={3} sx={{ zIndex: 1, maxWidth: 520 }}>
            <BrandLogo />
            <Typography variant="h2" color="inherit" sx={{ mt: 3 }}>
              Welcome back to CareConnect 360
            </Typography>
            <Typography sx={{ opacity: 0.92, fontSize: '1.06rem' }}>
              Connected healthcare, simplified. Access appointments, insurance workflows, and
              claim progress from one secure place.
            </Typography>

            <Stack spacing={2.2} sx={{ pt: 3 }}>
              <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                <HealingRoundedIcon />
                <Typography>Seamless patient-doctor coordination</Typography>
              </Stack>
              <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                <InsightsRoundedIcon />
                <Typography>Real-time workflow visibility across care stages</Typography>
              </Stack>
              <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                <SecurityRoundedIcon />
                <Typography>Role-based secure access with trusted backend validation</Typography>
              </Stack>
            </Stack>
          </Stack>
        </Grid>

        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            display: 'grid',
            placeItems: 'center',
            p: { xs: 2, sm: 4 },
          }}
        >
          <Card sx={{ width: '100%', maxWidth: 470 }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h3">Sign in</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Continue to your care workspace
                  </Typography>
                </Box>

                <ApiErrorAlert message={errorMessage} />

                <Box component="form" noValidate onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      autoComplete="email"
                    />

                    <TextField
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(event) => handleChange('password', event.target.value)}
                      autoComplete="current-password"
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword((visible) => !visible)}
                                edge="end"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? (
                                  <VisibilityOffRoundedIcon />
                                ) : (
                                  <VisibilityRoundedIcon />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Button type="submit" variant="contained" size="large" disabled={submitting}>
                      {submitting ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </Stack>
                </Box>

                <Divider />

                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    New to CareConnect 360?{' '}
                    <RouterLink to="/register" style={{ fontWeight: 700 }}>
                      Create patient account
                    </RouterLink>
                  </Typography>

                  <Box sx={{ minWidth: 220 }}>
                    <Alert severity="info" sx={{ py: 0 }}>
                      Forgot password: Coming soon
                    </Alert>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
