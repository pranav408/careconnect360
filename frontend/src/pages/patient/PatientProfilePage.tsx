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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import {
  getMyPatientProfile,
  updateMyPatientProfile,
} from '../../api/patientProfileApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import type {
  PatientGender,
  PatientProfileResponse,
  UpdatePatientProfileRequest,
} from '../../types/patient'

interface ProfilePageError {
  title: string
  message: string
}

interface ProfileFormValues {
  fullName: string
  phone: string
  address: string
  dateOfBirth: string
  gender: '' | PatientGender
}

type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>

const GENDER_OPTIONS: PatientGender[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']

function toProfileLoadError(error: unknown): ProfilePageError {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return {
      title: 'Access restricted',
      message: 'Your account is not allowed to open the patient profile.',
    }
  }

  if (status && status >= 500) {
    return {
      title: 'Profile service unavailable',
      message: 'The patient profile service is temporarily unavailable. Please try again shortly.',
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
    return 'Access restricted. Only patients can update this profile.'
  }

  if (status === 404) {
    return 'Your patient profile could not be found for this session.'
  }

  if (status === 409) {
    return getApiErrorMessage(error) || 'This profile update conflicts with an existing record.'
  }

  if (status === 400) {
    return getApiErrorMessage(error) || 'Please review your profile details and try again.'
  }

  if (status && status >= 500) {
    return 'The patient profile service is temporarily unavailable. Please retry shortly.'
  }

  return getApiErrorMessage(error)
}

function toFormValues(profile: PatientProfileResponse): ProfileFormValues {
  return {
    fullName: profile.fullName,
    phone: profile.phone,
    address: profile.address ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    gender: profile.gender ?? '',
  }
}

function padDateSegment(value: number): string {
  return String(value).padStart(2, '0')
}

function todayIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${padDateSegment(now.getMonth() + 1)}-${padDateSegment(now.getDate())}`
}

function previousIsoDate(): string {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  return `${now.getFullYear()}-${padDateSegment(now.getMonth() + 1)}-${padDateSegment(now.getDate())}`
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function validate(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {}
  const fullName = values.fullName.trim()
  const phone = values.phone.trim()
  const address = values.address.trim()
  const currentDate = todayIsoDate()

  if (!fullName) {
    errors.fullName = 'Full name is required.'
  } else if (fullName.length > 120) {
    errors.fullName = 'Full name cannot exceed 120 characters.'
  }

  if (!phone) {
    errors.phone = 'Phone number is required.'
  } else if (phone.length < 7 || phone.length > 20) {
    errors.phone = 'Phone number must contain between 7 and 20 characters.'
  }

  if (address.length > 255) {
    errors.address = 'Address cannot exceed 255 characters.'
  }

  if (values.dateOfBirth) {
    if (!isValidIsoDate(values.dateOfBirth)) {
      errors.dateOfBirth = 'Enter a valid date of birth.'
    } else if (values.dateOfBirth >= currentDate) {
      errors.dateOfBirth = 'Date of birth must be in the past.'
    }
  }

  if (values.gender && !GENDER_OPTIONS.includes(values.gender)) {
    errors.gender = 'Select a valid gender option.'
  }

  return errors
}

function toUpdateRequest(values: ProfileFormValues): UpdatePatientProfileRequest {
  return {
    fullName: values.fullName.trim(),
    phone: values.phone.trim(),
    address: values.address.trim() || undefined,
    dateOfBirth: values.dateOfBirth || undefined,
    gender: values.gender || undefined,
  }
}

function toLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function displayValue(value: string | null | undefined): string {
  if (!value) {
    return 'Not provided'
  }

  return value
}

function ProfileSkeleton() {
  return (
    <Stack spacing={2.2} role="status" aria-live="polite" aria-label="Loading your profile">
      <Typography variant="h2">Profile</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Skeleton variant="text" width="30%" height={34} />
                <Grid container spacing={2}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6 }}>
                      <Skeleton variant="text" width="35%" />
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
                <Skeleton variant="text" width="40%" height={34} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={44} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null)
  const [formValues, setFormValues] = useState<ProfileFormValues | null>(null)
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<ProfilePageError | null>(null)
  const [missingProfile, setMissingProfile] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const maxPastDate = useMemo(() => previousIsoDate(), [])

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setMissingProfile(false)

    try {
      const response = await getMyPatientProfile()
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
      const updatedProfile = await updateMyPatientProfile(toUpdateRequest(formValues))
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
        <Typography variant="h2">Profile</Typography>
        <EmptyState
          icon={<PersonRoundedIcon />}
          title="Profile not found"
          description="No patient profile was found for this session. Please contact support if this continues."
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
        message="No patient profile data was returned. Please retry."
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
          <Typography variant="h2">Profile</Typography>
          <Typography color="text.secondary">
            Review and update the profile details linked to your current patient account.
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
                      ? 'Only the fields supported by your patient profile are editable here.'
                      : 'These details come directly from your authenticated patient profile.'}
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
                        autoComplete="name"
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
                        label="Phone"
                        value={formValues.phone}
                        onChange={(event) => handleFieldChange('phone', event.target.value)}
                        error={Boolean(formErrors.phone)}
                        helperText={formErrors.phone ?? '7 to 20 characters.'}
                        required
                        autoComplete="tel"
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
                        label="Date of Birth"
                        type="date"
                        value={formValues.dateOfBirth}
                        onChange={(event) => handleFieldChange('dateOfBirth', event.target.value)}
                        error={Boolean(formErrors.dateOfBirth)}
                        helperText={formErrors.dateOfBirth ?? 'Optional. Must be in the past.'}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            max: maxPastDate,
                            'aria-label': 'Date of Birth',
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Gender"
                        value={formValues.gender}
                        onChange={(event) =>
                          handleFieldChange('gender', event.target.value as '' | PatientGender)
                        }
                        error={Boolean(formErrors.gender)}
                        helperText={formErrors.gender ?? 'Optional.'}
                        slotProps={{
                          select: {
                            displayEmpty: true,
                          },
                          htmlInput: {
                            'aria-label': 'Gender',
                          },
                        }}
                      >
                        <MenuItem value="">Not specified</MenuItem>
                        {GENDER_OPTIONS.map((gender) => (
                          <MenuItem key={gender} value={gender}>
                            {toLabel(gender)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid size={12}>
                      <TextField
                        label="Address"
                        value={formValues.address}
                        onChange={(event) => handleFieldChange('address', event.target.value)}
                        error={Boolean(formErrors.address)}
                        helperText={formErrors.address ?? 'Optional.'}
                        multiline
                        minRows={3}
                        autoComplete="street-address"
                        slotProps={{
                          htmlInput: {
                            maxLength: 255,
                            'aria-label': 'Address',
                          },
                        }}
                      />
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
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Full Name
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>{displayValue(profile.fullName)}</Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>{displayValue(profile.phone)}</Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Date of Birth
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>{displayValue(profile.dateOfBirth)}</Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Gender
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>
                          {profile.gender ? toLabel(profile.gender) : 'Not provided'}
                        </Typography>
                      </Stack>
                    </Grid>

                    <Grid size={12}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Address
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>{displayValue(profile.address)}</Typography>
                      </Stack>
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
                  <Chip label="Patient" color="secondary" />
                  {profile.accountStatus ? <Chip label={toLabel(profile.accountStatus)} color="primary" /> : null}
                </Stack>

                {profile.email ? (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Account Email
                    </Typography>
                    <Typography sx={{ fontWeight: 600 }}>{profile.email}</Typography>
                  </Stack>
                ) : null}

                <Typography color="text.secondary">
                  Identity and ownership are resolved from your signed-in session. Email and account role are read-only here.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}