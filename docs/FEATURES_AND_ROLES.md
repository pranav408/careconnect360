# Features and Roles

## Capability by Role

### PATIENT
- Supported:
  - registration and login
  - patient dashboard
  - own profile view/update
  - doctor directory and doctor detail
  - appointment booking/list/cancel
  - insurance submission/list/active policy view
  - own claims list/detail
  - mock payment submission and payment history
  - notification list/unread/read workflows
- Read-only:
  - doctor profile data from directory/detail
- Not implemented:
  - none critical inside current patient scope

### DOCTOR
- Supported:
  - login
  - doctor overview/dashboard-style page
  - assigned appointment list
  - confirm/reject/complete transitions
  - self-profile view/update
- Read-only:
  - none material
- Not implemented:
  - explicit schedule/availability management endpoints are not exposed for doctor self-service in current API

### ADMIN
- Supported:
  - admin dashboard
  - doctor creation
  - insurance queue listing with activate/reject
  - claim queue listing with verify/approve/reject
- Read-only:
  - doctor directory/detail through shared doctor endpoints
- Not implemented:
  - doctor edit endpoint
  - doctor account-status management endpoint
  - doctor availability management endpoint

## Role Permission Matrix

| Feature Area | PATIENT | DOCTOR | ADMIN | Status |
|---|---|---|---|---|
| Auth login and JWT session | Yes | Yes | Yes | Supported |
| Patient self-registration | Yes | No | No | Supported |
| Patient profile `/api/patients/me` | Own profile only | No | No | Supported |
| Doctor directory `/api/doctors` | Read | Read | Read | Supported |
| Doctor self-profile `/api/doctors/me` | No | Own profile edit/read | No | Supported |
| Admin doctor creation `/api/admin/doctors` | No | No | Create | Supported |
| Patient appointments `/api/appointments` | Create/list/cancel own | No | No | Supported |
| Doctor appointments `/api/doctor/appointments` | No | Manage assigned | No | Supported |
| Patient insurance `/api/insurance/policies` | Submit/list own | No | No | Supported |
| Admin insurance `/api/admin/insurance/policies` | No | No | Review/activate/reject | Supported |
| Patient claims `/api/claims` | List/detail own | No | No | Supported |
| Admin claims `/api/admin/claims` | No | No | Verify/approve/reject | Supported |
| Patient payments `/api/payments` | Mock pay/list own | No | No | Supported |
| Patient notifications `/api/notifications` | List/read own | No | No | Supported |
| Patient dashboard | Own metrics | No | No | Supported |
| Admin dashboard | No | No | System metrics | Supported |
| Admin doctor edit/status/availability APIs | No | No | No | Not implemented |

## Supported vs Missing Scope Summary
- Current MVP fully supports the verified end-to-end healthcare workflow.
- Admin operational control is intentionally scoped to creation and review workflows, not full doctor account lifecycle administration.