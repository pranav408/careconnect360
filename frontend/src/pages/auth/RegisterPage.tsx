import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import { ApiErrorAlert } from '../../components/common/ApiErrorAlert'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useAuth } from '../../auth/useAuth'
import type { PatientGender, RegisterPatientRequest } from '../../types/auth'
import { getRoleHomePath } from '../../auth/roleUtils'
import { getApiErrorMessage } from '../../api/apiClient'

interface FormState {
  fullName: string
  email: string
  password: string
  phone: string
  address: string
  dateOfBirth: string
  gender: '' | PatientGender
}

const initialForm: FormState = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  gender: '',
}

export function RegisterPage() {
  const { register, isAuthenticated, user, isRestoringSession } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const validationError = useMemo(() => {
    if (!form.fullName.trim()) {
      return 'Full name is required'
    }

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

    if (form.password.length < 8 || form.password.length > 72) {
      return 'Password must contain between 8 and 72 characters'
    }

    if (!form.phone.trim()) {
      return 'Phone number is required'
    }

    return null
  }, [form])

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  if (isRestoringSession) {
    return null
  }

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrorMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload: RegisterPatientRequest = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      address: form.address.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
    }

    try {
      const response = await register(payload)
      setSuccessMessage(response.message)
      setForm(initialForm)
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 3, sm: 5 }, px: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <BrandLogo />

        <Card sx={{ width: '100%', maxWidth: 920 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h3">Create patient account</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  Start your CareConnect 360 journey with secure patient access.
                </Typography>
              </Box>

              <ApiErrorAlert message={errorMessage} />
              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Name"
                      value={form.fullName}
                      onChange={(event) => handleChange('fullName', event.target.value)}
                      autoComplete="name"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      autoComplete="email"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(event) => handleChange('password', event.target.value)}
                      autoComplete="new-password"
                      helperText="Use 8-72 characters."
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
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Phone"
                      value={form.phone}
                      onChange={(event) => handleChange('phone', event.target.value)}
                      autoComplete="tel"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Date of Birth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(event) => handleChange('dateOfBirth', event.target.value)}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { max: format(new Date(), 'yyyy-MM-dd') },
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel id="gender-label">Gender</InputLabel>
                      <Select
                        labelId="gender-label"
                        label="Gender"
                        value={form.gender}
                        onChange={(event) =>
                          handleChange('gender', event.target.value as '' | PatientGender)
                        }
                      >
                        <MenuItem value="MALE">Male</MenuItem>
                        <MenuItem value="FEMALE">Female</MenuItem>
                        <MenuItem value="OTHER">Other</MenuItem>
                        <MenuItem value="PREFER_NOT_TO_SAY">Prefer not to say</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      label="Address"
                      value={form.address}
                      onChange={(event) => handleChange('address', event.target.value)}
                      multiline
                      minRows={2}
                      autoComplete="street-address"
                    />
                  </Grid>

                  <Grid size={12}>
                    <Button type="submit" variant="contained" size="large" disabled={submitting}>
                      {submitting ? 'Creating account...' : 'Create patient account'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Already have an account?{' '}
                <RouterLink to="/login" style={{ fontWeight: 700 }}>
                  Sign in
                </RouterLink>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}
