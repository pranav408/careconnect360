import EditRoundedIcon from '@mui/icons-material/EditRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { getMyDoctorProfile, updateMyDoctorProfile } from '../../api/doctorProfileApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import type { DoctorProfileResponse, UpdateDoctorProfileRequest } from '../../types/doctorProfile'

interface ProfilePageError {
  title: string
  message: string
}

interface ProfileFormValues {
  fullName: string
  specialization: string
  phone: string
  consultationFee: string
  available: 'true' | 'false'
}

type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toProfileLoadError(error: unknown): ProfilePageError {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return {
      title: 'Access restricted',
      message: 'Your account is not allowed to open the doctor profile.',
    }
  }

  if (status && status >= 500) {
    return {
      title: 'Profile service unavailable',
      message: 'The doctor profile service is temporarily unavailable. Please try again shortly.',
    }
  }

  return {
    title: 'Unable to load profile',
    message: getApiErrorMessage(error),
  }
}

function toSubmitErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted. Only doctor users can update this profile.'
  }

  if (status === 404) {
    return 'Your doctor profile could not be found for this session.'
  }

  if (status === 400) {
    return getApiErrorMessage(error) || 'Please review your profile details and try again.'
  }

  if (status && status >= 500) {
    return 'The doctor profile service is temporarily unavailable. Please retry shortly.'
  }

  return getApiErrorMessage(error)
}

function toFormValues(profile: DoctorProfileResponse): ProfileFormValues {
  return {
    fullName: profile.fullName,
    specialization: profile.specialization,
    phone: profile.phone,
    consultationFee: String(profile.consultationFee),
    available: profile.available ? 'true' : 'false',
  }
}

function validate(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {}
  const fullName = values.fullName.trim()
  const specialization = values.specialization.trim()
  const phone = values.phone.trim()

  if (!fullName) {
    errors.fullName = 'Full name is required.'
  } else if (fullName.length > 120) {
    errors.fullName = 'Full name cannot exceed 120 characters.'
  }

  if (!specialization) {
    errors.specialization = 'Specialization is required.'
  } else if (specialization.length > 100) {
    errors.specialization = 'Specialization cannot exceed 100 characters.'
  }

  if (!phone) {
    errors.phone = 'Phone number is required.'
  } else if (phone.length > 20) {
    errors.phone = 'Phone number cannot exceed 20 characters.'
  }

  if (!values.consultationFee.trim()) {
    errors.consultationFee = 'Consultation fee is required.'
  } else {
    const parsedFee = Number(values.consultationFee)
    if (Number.isNaN(parsedFee)) {
      errors.consultationFee = 'Enter a valid consultation fee.'
    } else if (parsedFee < 0) {
      errors.consultationFee = 'Consultation fee cannot be negative.'
    }
  }

  if (values.available !== 'true' && values.available !== 'false') {
    errors.available = 'Availability is required.'
  }

  return errors
}

function toUpdateRequest(values: ProfileFormValues): UpdateDoctorProfileRequest {
  return {
    fullName: values.fullName.trim(),
    specialization: values.specialization.trim(),
    phone: values.phone.trim(),
    consultationFee: Number(values.consultationFee),
    available: values.available === 'true',
  }
}

function formatUsd(value: number): string {
  return usdFormatter.format(value)
}

function toLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function ProfileSkeleton() {
  return (
    <Stack spacing={2.2} role="status" aria-live="polite" aria-label="Loading your doctor profile">
      <Typography variant="h2">Doctor Profile</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Skeleton variant="text" width="36%" height={34} />
                <Grid container spacing={2}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6 }}>
                      <Skeleton variant="text" width="34%" />
                      <Skeleton variant="rounded" height={54} />
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Skeleton variant="text" width="44%" height={34} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={64} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorProfileResponse | null>(null)
  const [formValues, setFormValues] = useState<ProfileFormValues | null>(null)
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<ProfilePageError | null>(null)
  const [missingProfile, setMissingProfile] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setMissingProfile(false)

    try {
      const response = await getMyDoctorProfile()
      setProfile(response)
      setFormValues(toFormValues(response))
    } catch (error) {
      if (getApiErrorStatus(error) === 404) {
        setMissingProfile(true)
        setProfile(null)
        setFormValues(null)
      } else {
        setLoadError(toProfileLoadError(error))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadProfile()
    })
  }, [loadProfile])

  const handleFieldChange = useCallback(
    <K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) => {
      setFormValues((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          [field]: value,
        }
      })

      if (formErrors[field]) {
        setFormErrors((current) => ({
          ...current,
          [field]: undefined,
        }))
      }

      setSubmitError(null)
    },
    [formErrors],
  )

  const handleStartEditing = () => {
    if (!profile) {
      return
    }

    setFormValues(toFormValues(profile))
    setFormErrors({})
    setSubmitError(null)
    setSuccessMessage(null)
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    if (!profile) {
      return
    }

    setFormValues(toFormValues(profile))
    setFormErrors({})
    setSubmitError(null)
    setIsEditing(false)
  }

  const handleSubmit = async () => {
    if (!formValues || isSubmitting) {
      return
    }

    const nextErrors = validate(formValues)
    setFormErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)

    try {
      const updatedProfile = await updateMyDoctorProfile(toUpdateRequest(formValues))
      setProfile(updatedProfile)
      setFormValues(toFormValues(updatedProfile))
      setFormErrors({})
      setIsEditing(false)
      setSuccessMessage('Profile updated successfully.')
    } catch (error) {
      setSubmitError(toSubmitErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && !profile) {
    return <ProfileSkeleton />
  }

  if (loadError && !profile) {
    return <PageError title={loadError.title} message={loadError.message} onRetry={() => void loadProfile()} />
  }

  if (missingProfile) {
    return (
      <Stack spacing={2.2}>
        <Typography variant="h2">Doctor Profile</Typography>
        <EmptyState
          icon={<PersonRoundedIcon />}
          title="Profile not found"
          description="No authenticated doctor profile was found for this session. Please contact support if this continues."
          actionLabel="Try Again"
          onAction={() => void loadProfile()}
        />
      </Stack>
    )
  }

  if (!profile || !formValues) {
    return (
      <PageError
        title="Profile unavailable"
        message="No doctor profile data was returned. Please retry."
        onRetry={() => void loadProfile()}
      />
    )
  }

  return (
    <Stack spacing={2.2}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.4}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h2">Doctor Profile</Typography>
          <Typography color="text.secondary">
            Review and update the professional details linked to your authenticated doctor account.
          </Typography>
        </Stack>

        {!isEditing ? (
          <Button
            variant="contained"
            startIcon={<EditRoundedIcon />}
            onClick={handleStartEditing}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Edit Profile
          </Button>
        ) : null}
      </Stack>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h3">{isEditing ? 'Edit details' : 'Profile details'}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {isEditing
                      ? 'Only doctor-editable fields are available here.'
                      : 'These values come directly from your authenticated doctor profile.'}
                  </Typography>
                </Box>

                {submitError ? <Alert severity="error">{submitError}</Alert> : null}

                {isEditing ? (
                  <Grid container spacing={2} component="form" noValidate>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Full Name"
                        value={formValues.fullName}
                        onChange={(event) => handleFieldChange('fullName', event.target.value)}
                        error={Boolean(formErrors.fullName)}
                        helperText={formErrors.fullName}
                        required
                        slotProps={{
                          htmlInput: {
                            maxLength: 120,
                            'aria-label': 'Full Name',
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Specialization"
                        value={formValues.specialization}
                        onChange={(event) => handleFieldChange('specialization', event.target.value)}
                        error={Boolean(formErrors.specialization)}
                        helperText={formErrors.specialization}
                        required
                        slotProps={{
                          htmlInput: {
                            maxLength: 100,
                            'aria-label': 'Specialization',
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Phone"
                        value={formValues.phone}
                        onChange={(event) => handleFieldChange('phone', event.target.value)}
                        error={Boolean(formErrors.phone)}
                        helperText={formErrors.phone}
                        required
                        slotProps={{
                          htmlInput: {
                            maxLength: 20,
                            'aria-label': 'Phone',
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Consultation Fee (USD)"
                        type="number"
                        value={formValues.consultationFee}
                        onChange={(event) => handleFieldChange('consultationFee', event.target.value)}
                        error={Boolean(formErrors.consultationFee)}
                        helperText={formErrors.consultationFee ?? 'Enter a non-negative amount.'}
                        required
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            step: '0.01',
                            'aria-label': 'Consultation Fee',
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Availability"
                        value={formValues.available}
                        onChange={(event) => handleFieldChange('available', event.target.value as 'true' | 'false')}
                        error={Boolean(formErrors.available)}
                        helperText={formErrors.available}
                        required
                        slotProps={{
                          htmlInput: {
                            'aria-label': 'Availability',
                          },
                        }}
                      >
                        <MenuItem value="true">Available</MenuItem>
                        <MenuItem value="false">Unavailable</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid size={12}>
                      <Stack
                        direction={{ xs: 'column-reverse', sm: 'row' }}
                        spacing={1.2}
                        sx={{ justifyContent: 'flex-end' }}
                      >
                        <Button
                          variant="outlined"
                          onClick={handleCancelEditing}
                          disabled={isSubmitting}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => void handleSubmit()}
                          disabled={isSubmitting}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Full Name" value={profile.fullName} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Specialization" value={profile.specialization} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Phone" value={profile.phone} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Consultation Fee" value={formatUsd(profile.consultationFee)} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Field label="Availability" value={profile.available ? 'Available' : 'Unavailable'} />
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={1.5}>
                <Typography variant="h3">Account summary</Typography>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Chip label="Doctor" color="secondary" />
                  <Chip label={toLabel(profile.accountStatus)} color="primary" />
                </Stack>

                <Field label="Account Email" value={profile.email} wrapLongValue />
                <Field label="Account Status" value={toLabel(profile.accountStatus)} />
                <Field label="Doctor ID" value={String(profile.doctorId)} />

                <Typography color="text.secondary">
                  Identity and ownership are resolved from your signed-in session. Email, account status, and IDs are read-only.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

function Field({
  label,
  value,
  wrapLongValue = false,
}: {
  label: string
  value: string
  wrapLongValue?: boolean
}) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, overflowWrap: wrapLongValue ? 'anywhere' : undefined }}>
        {value}
      </Typography>
    </Stack>
  )
}