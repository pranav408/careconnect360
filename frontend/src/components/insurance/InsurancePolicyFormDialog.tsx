import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  TextField,
} from '@mui/material'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import { submitInsurancePolicy } from '../../api/insuranceApi'
import { ApiErrorAlert } from '../common/ApiErrorAlert'
import type { CreateInsurancePolicyRequest, InsurancePolicyResponse } from '../../types/insurance'

interface InsurancePolicyFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmitted: (policy: InsurancePolicyResponse) => void
}

interface InsuranceFormValues {
  providerName: string
  policyNumber: string
  coveragePercentage: string
  deductibleAmount: string
  startDate: string
  endDate: string
}

type InsuranceFormErrors = Partial<Record<keyof InsuranceFormValues, string>>

const INITIAL_VALUES: InsuranceFormValues = {
  providerName: '',
  policyNumber: '',
  coveragePercentage: '',
  deductibleAmount: '',
  startDate: '',
  endDate: '',
}

function toSafeErrorMessage(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted. Only patients can submit insurance policies.'
  }

  if (status === 409) {
    return getApiErrorMessage(error) || 'A policy with this number already exists.'
  }

  if (status === 400) {
    return getApiErrorMessage(error) || 'Please review the policy details and try again.'
  }

  if (status && status >= 500) {
    return 'The insurance service is temporarily unavailable. Please retry shortly.'
  }

  return getApiErrorMessage(error)
}

function validate(values: InsuranceFormValues): InsuranceFormErrors {
  const errors: InsuranceFormErrors = {}
  const providerName = values.providerName.trim()
  const policyNumber = values.policyNumber.trim()
  const coverageNumber = Number(values.coveragePercentage)
  const deductibleNumber = Number(values.deductibleAmount)

  if (!providerName) {
    errors.providerName = 'Provider name is required.'
  }

  if (!policyNumber) {
    errors.policyNumber = 'Policy number is required.'
  }

  if (values.coveragePercentage.trim() === '') {
    errors.coveragePercentage = 'Coverage percentage is required.'
  } else if (!Number.isFinite(coverageNumber)) {
    errors.coveragePercentage = 'Coverage percentage must be a valid number.'
  } else if (coverageNumber < 0 || coverageNumber > 100) {
    errors.coveragePercentage = 'Coverage percentage must be between 0 and 100.'
  }

  if (values.deductibleAmount.trim() === '') {
    errors.deductibleAmount = 'Deductible amount is required.'
  } else if (!Number.isFinite(deductibleNumber)) {
    errors.deductibleAmount = 'Deductible amount must be a valid number.'
  } else if (deductibleNumber < 0) {
    errors.deductibleAmount = 'Deductible amount cannot be negative.'
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required.'
  }

  if (!values.endDate) {
    errors.endDate = 'End date is required.'
  }

  if (values.startDate && values.endDate && values.endDate <= values.startDate) {
    errors.endDate = 'End date must be after start date.'
  }

  return errors
}

function toRequest(values: InsuranceFormValues): CreateInsurancePolicyRequest {
  return {
    providerName: values.providerName.trim(),
    policyNumber: values.policyNumber.trim(),
    coveragePercentage: Number(values.coveragePercentage),
    deductibleAmount: Number(values.deductibleAmount),
    startDate: values.startDate,
    endDate: values.endDate,
  }
}

export function InsurancePolicyFormDialog({
  open,
  onClose,
  onSubmitted,
}: InsurancePolicyFormDialogProps) {
  const [values, setValues] = useState<InsuranceFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<InsuranceFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const descriptionId = useMemo(() => 'insurance-policy-dialog-description', [])

  const handleFieldChange = (field: keyof InsuranceFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }))
    }
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    setSubmitError(null)
    setErrors({})
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting) {
      return
    }

    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await submitInsurancePolicy(toRequest(values))
      setValues(INITIAL_VALUES)
      setErrors({})
      onSubmitted(response)
    } catch (error) {
      setSubmitError(toSafeErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      aria-describedby={descriptionId}
    >
      <DialogTitle>Add Insurance Policy</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId} sx={{ mb: 1.5 }}>
          Submit your insurance details for admin review. New submissions are always created as pending.
        </DialogContentText>

        <Stack spacing={1.5}>
          <ApiErrorAlert message={submitError} />

          <Grid container spacing={1.4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Provider Name"
                value={values.providerName}
                onChange={(event) => handleFieldChange('providerName', event.target.value)}
                error={Boolean(errors.providerName)}
                helperText={errors.providerName}
                required
                slotProps={{
                  htmlInput: {
                    maxLength: 120,
                    'aria-label': 'Provider Name',
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Policy Number"
                value={values.policyNumber}
                onChange={(event) => handleFieldChange('policyNumber', event.target.value)}
                error={Boolean(errors.policyNumber)}
                helperText={errors.policyNumber}
                required
                slotProps={{
                  htmlInput: {
                    maxLength: 80,
                    'aria-label': 'Policy Number',
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Coverage Percentage"
                type="number"
                value={values.coveragePercentage}
                onChange={(event) => handleFieldChange('coveragePercentage', event.target.value)}
                error={Boolean(errors.coveragePercentage)}
                helperText={errors.coveragePercentage ?? 'Enter a value from 0 to 100.'}
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: 100,
                    step: '0.01',
                    'aria-label': 'Coverage Percentage',
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Deductible Amount"
                type="number"
                value={values.deductibleAmount}
                onChange={(event) => handleFieldChange('deductibleAmount', event.target.value)}
                error={Boolean(errors.deductibleAmount)}
                helperText={errors.deductibleAmount ?? 'Amount in USD.'}
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: '0.01',
                    'aria-label': 'Deductible Amount',
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Start Date"
                type="date"
                value={values.startDate}
                onChange={(event) => handleFieldChange('startDate', event.target.value)}
                error={Boolean(errors.startDate)}
                helperText={errors.startDate}
                required
                slotProps={{
                  htmlInput: {
                    'aria-label': 'Start Date',
                  },
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="End Date"
                type="date"
                value={values.endDate}
                onChange={(event) => handleFieldChange('endDate', event.target.value)}
                error={Boolean(errors.endDate)}
                helperText={errors.endDate}
                required
                slotProps={{
                  htmlInput: {
                    'aria-label': 'End Date',
                  },
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
