import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded'
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded'
import {
  Alert,
  Button,
  Chip,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage, getApiErrorStatus } from '../../api/apiClient'
import {
  getMyActiveInsurancePolicy,
  getMyInsurancePolicies,
} from '../../api/insuranceApi'
import { EmptyState } from '../../components/common/EmptyState'
import { PageError } from '../../components/common/PageError'
import { ActiveInsuranceCard } from '../../components/insurance/ActiveInsuranceCard'
import { InsurancePolicyFormDialog } from '../../components/insurance/InsurancePolicyFormDialog'
import { InsurancePolicySkeleton } from '../../components/insurance/InsurancePolicySkeleton'
import { InsurancePolicyTable } from '../../components/insurance/InsurancePolicyTable'
import { InsuranceStatusSummary } from '../../components/insurance/InsuranceStatusSummary'
import type { InsurancePolicyResponse, PolicyStatus } from '../../types/insurance'

interface InsurancePageError {
  title: string
  message: string
}

function toPoliciesError(error: unknown): InsurancePageError {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return {
      title: 'Access restricted',
      message: 'Your account is not allowed to view patient insurance policies.',
    }
  }

  if (status === 404) {
    return {
      title: 'Insurance records not found',
      message: 'No patient insurance records were found for this session.',
    }
  }

  if (status && status >= 500) {
    return {
      title: 'Insurance service unavailable',
      message: 'The insurance service is temporarily unavailable. Please try again shortly.',
    }
  }

  return {
    title: 'Unable to load insurance policies',
    message: getApiErrorMessage(error),
  }
}

function toActivePolicyError(error: unknown): string {
  const status = getApiErrorStatus(error)

  if (status === 403) {
    return 'Access restricted. Your account cannot view active insurance policy details.'
  }

  if (status && status >= 500) {
    return 'Could not load your active policy right now. Please retry.'
  }

  return getApiErrorMessage(error)
}

function emptyStatusCounts(): Record<PolicyStatus, number> {
  return {
    PENDING: 0,
    ACTIVE: 0,
    REJECTED: 0,
    EXPIRED: 0,
  }
}

function countByStatus(policies: InsurancePolicyResponse[]): Record<PolicyStatus, number> {
  const counts = emptyStatusCounts()

  for (const policy of policies) {
    counts[policy.status] += 1
  }

  return counts
}

export function PatientInsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicyResponse[] | null>(null)
  const [activePolicy, setActivePolicy] = useState<InsurancePolicyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [policiesError, setPoliciesError] = useState<InsurancePageError | null>(null)
  const [activePolicyError, setActivePolicyError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadInsurance = useCallback(async () => {
    setIsLoading(true)
    setPoliciesError(null)
    setActivePolicyError(null)

    const [policiesResult, activeResult] = await Promise.allSettled([
      getMyInsurancePolicies(),
      getMyActiveInsurancePolicy(),
    ])

    if (policiesResult.status === 'fulfilled') {
      setPolicies(policiesResult.value)
    } else {
      setPoliciesError(toPoliciesError(policiesResult.reason))
    }

    if (activeResult.status === 'fulfilled') {
      setActivePolicy(activeResult.value)
    } else if (getApiErrorStatus(activeResult.reason) === 404) {
      setActivePolicy(null)
    } else {
      setActivePolicyError(toActivePolicyError(activeResult.reason))
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadInsurance()
    })
  }, [loadInsurance])

  const statusCounts = useMemo(
    () => countByStatus(policies ?? []),
    [policies],
  )

  if (isLoading && !policies) {
    return <InsurancePolicySkeleton />
  }

  if (policiesError && !policies) {
    return (
      <PageError
        title={policiesError.title}
        message={policiesError.message}
        onRetry={() => {
          void loadInsurance()
        }}
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
          <Typography variant="h2">Insurance</Typography>
          <Typography color="text.secondary">
            Manage your health insurance coverage and submit policy details for care settlement review.
          </Typography>
          <Chip label="Patient" color="secondary" sx={{ width: 'fit-content' }} />
        </Stack>

        <Button
          variant="contained"
          startIcon={<AddCircleOutlineRoundedIcon />}
          onClick={() => setIsDialogOpen(true)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Add Insurance Policy
        </Button>
      </Stack>

      {policiesError && policies ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadInsurance()}>
              Retry
            </Button>
          }
        >
          {policiesError.message}
        </Alert>
      ) : null}

      <Stack spacing={1.1}>
        <Typography variant="h3">Active Policy</Typography>
        <ActiveInsuranceCard
          policy={activePolicy}
          errorMessage={activePolicyError}
          onRetry={() => void loadInsurance()}
          onAddPolicy={() => setIsDialogOpen(true)}
        />
      </Stack>

      <Stack spacing={1.1}>
        <Typography variant="h3">All Policies</Typography>

        {(policies ?? []).length > 0 ? (
          <>
            <InsuranceStatusSummary counts={statusCounts} />
            <InsurancePolicyTable policies={policies ?? []} />
          </>
        ) : (
          <EmptyState
            icon={<HealthAndSafetyRoundedIcon />}
            title="No insurance policies submitted"
            description="You have not submitted an insurance policy yet. Add one now to begin eligibility review."
            actionLabel="Add Insurance Policy"
            onAction={() => setIsDialogOpen(true)}
          />
        )}
      </Stack>

      <InsurancePolicyFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmitted={(policy) => {
          setSuccessMessage('Insurance policy submitted for review.')
          setIsDialogOpen(false)

          setPolicies((current) => {
            if (!current) {
              return current
            }
            return [policy, ...current]
          })

          void loadInsurance()
        }}
      />

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3500}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
