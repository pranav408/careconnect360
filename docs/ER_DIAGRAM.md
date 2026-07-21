# CareConnect360 ER Diagram

## Entity Model
The backend defines eight domain tables plus users, with shared primary key strategy from BaseEntity (`id`) and audit fields (`created_at`, `updated_at`).
Flyway baseline migration `V1__baseline_schema.sql` reproduces this schema for new empty MySQL databases.

```mermaid
erDiagram
  USERS {
    BIGINT id PK
    VARCHAR email UK
    VARCHAR password_hash
    VARCHAR role
    VARCHAR status
    DATETIME created_at
    DATETIME updated_at
  }

  PATIENTS {
    BIGINT id PK
    BIGINT user_id FK UK
    VARCHAR full_name
    VARCHAR phone
    VARCHAR address
    DATE date_of_birth
    VARCHAR gender
    DATETIME created_at
    DATETIME updated_at
  }

  DOCTORS {
    BIGINT id PK
    BIGINT user_id FK UK
    VARCHAR full_name
    VARCHAR specialization
    VARCHAR license_number UK
    VARCHAR phone
    DECIMAL consultation_fee
    VARCHAR clinic_address
    BOOLEAN available_for_appointments
    DATETIME created_at
    DATETIME updated_at
  }

  INSURANCE_POLICIES {
    BIGINT id PK
    BIGINT patient_id FK
    VARCHAR provider_name
    VARCHAR policy_number UK
    DECIMAL coverage_percentage
    DECIMAL deductible_amount
    DATE start_date
    DATE end_date
    VARCHAR status
    DATETIME created_at
    DATETIME updated_at
  }

  APPOINTMENTS {
    BIGINT id PK
    BIGINT patient_id FK
    BIGINT doctor_id FK
    DATE appointment_date
    TIME appointment_time
    VARCHAR reason
    VARCHAR status
    DATETIME created_at
    DATETIME updated_at
  }

  CLAIMS {
    BIGINT id PK
    BIGINT appointment_id FK UK
    BIGINT insurance_policy_id FK
    DECIMAL requested_amount
    DECIMAL approved_amount
    DECIMAL patient_responsibility
    VARCHAR status
    VARCHAR rejection_reason
    DATETIME created_at
    DATETIME updated_at
  }

  PAYMENTS {
    BIGINT id PK
    BIGINT claim_id FK UK
    DECIMAL amount
    VARCHAR transaction_reference UK
    VARCHAR status
    DATETIME paid_at
    VARCHAR failure_reason
    DATETIME created_at
    DATETIME updated_at
  }

  NOTIFICATIONS {
    BIGINT id PK
    BIGINT recipient_id FK
    VARCHAR type
    VARCHAR title
    VARCHAR message
    BOOLEAN is_read
    DATETIME read_at
    VARCHAR email_delivery_status
    DATETIME email_sent_at
    VARCHAR email_failure_reason
    VARCHAR related_entity_type
    BIGINT related_entity_id
    DATETIME created_at
    DATETIME updated_at
  }

  USERS ||--o| PATIENTS : has_profile
  USERS ||--o| DOCTORS : has_profile
  USERS ||--o{ NOTIFICATIONS : receives

  PATIENTS ||--o{ INSURANCE_POLICIES : owns
  PATIENTS ||--o{ APPOINTMENTS : books

  DOCTORS ||--o{ APPOINTMENTS : attends

  INSURANCE_POLICIES ||--o{ CLAIMS : linked_to
  APPOINTMENTS ||--o| CLAIMS : generates
  CLAIMS ||--o| PAYMENTS : paid_by
```

## Relationship Notes
- One-to-one:
  - users -> patients via unique `patients.user_id`.
  - users -> doctors via unique `doctors.user_id`.
  - appointments -> claims via unique `claims.appointment_id`.
  - claims -> payments via unique `payments.claim_id`.
- One-to-many:
  - patient -> insurance_policies.
  - patient -> appointments.
  - doctor -> appointments.
  - insurance_policy -> claims.
  - user -> notifications.

## Unique Constraints (Visible in Source)
- `users.email`
- `doctors.user_id`
- `doctors.license_number`
- `insurance_policies.policy_number`
- `insurance_policies.active_patient_id` (generated column, unique for `ACTIVE` policies only)
- `claims.appointment_id`
- `payments.claim_id`
- `payments.transaction_reference`

## Major Enum/Status Columns
- users.status: ACTIVE, INACTIVE, LOCKED
- users.role: PATIENT, DOCTOR, ADMIN
- patients.gender: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
- insurance_policies.status: PENDING, ACTIVE, REJECTED, EXPIRED
- appointments.status: REQUESTED, CONFIRMED, REJECTED, CANCELLED, COMPLETED
- claims.status: SUBMITTED, VERIFIED, APPROVED, REJECTED, PAID
- payments.status: INITIATED, SUCCESS, FAILED
- notifications.email_delivery_status: NOT_REQUESTED, PENDING, SENT, FAILED

## Financial Precision
- Monetary and percentage fields are modeled with BigDecimal-backed DECIMAL columns.

## Business Integrity Rules
- One claim per appointment is enforced by unique `claims.appointment_id` and claim-existence checks.
- One payment record per claim is enforced by unique `payments.claim_id` and duplicate-payment checks.
- One successful-payment-per-claim business result follows because claim is moved to PAID after success and duplicate payment creation is blocked.
- At most one active insurance policy per patient is enforced at the database level by generated nullable `active_patient_id` and unique index `uk_insurance_policies_active_patient`.

## V2 Performance Indexes
- `idx_appointments_doctor_status_date_time` on `(doctor_id, status, appointment_date, appointment_time)` supports doctor status/date/time filtering and ordering queries.
- `idx_appointments_patient_status_date_time` on `(patient_id, status, appointment_date, appointment_time)` supports patient status/date/time filtering and ordering queries.
- `idx_payments_status_created_at` on `(status, created_at)` supports status-based payment list/reporting queries ordered by creation time.

## Migration Ownership
- Versioned schema history is tracked in `flyway_schema_history`.
- Do not edit applied migrations (including `V1` and `V2`); add new versioned migrations (`V3+`) for schema evolution.