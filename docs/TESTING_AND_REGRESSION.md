# Testing and Regression Report

## Strategy
- Backend: unit/service/controller/integration-style tests around auth, profiles, insurance, appointments, claims, payments, notifications, and dashboards.
- Frontend: API-module tests, route/protection tests, and page-level behavior tests.
- Security focus: authentication requirements, role restrictions, ownership checks, and status-transition guards.
- Manual E2E: complete role workflow across patient, doctor, and admin modules.
- Data integrity checks: duplicate-claim and duplicate-successful-payment prevention.

## Verified Results (Current State)
- Backend automated tests: 188 passed.
- Frontend automated tests: 203 passed.
- Frontend build: passed.
- Frontend lint: passed.
- Frontend API testing: passed.
- Backend startup verification: passed.
- Complete manual browser E2E workflow: passed.
- Source fixes required during final regression: none.

## Manual E2E Coverage Confirmed
- Admin doctor creation
- Patient registration and profile
- Insurance submission and activation
- Appointment request, confirmation, and completion
- Automatic claim creation
- Claim verification and approval
- Mock payment success
- Claim PAID transition
- Notification read workflow

## Security and Access Validation
- `/me` endpoints bound to JWT principal identity.
- Patient-only access enforced for patient resources.
- Doctor-only workflow access enforced for doctor appointment operations.
- Admin-only access enforced for insurance/claim decision and doctor creation operations.

## Non-Blocking Observations
- Vite large-chunk warning may appear during production build output.
- Occasional jsdom AggregateError stderr noise may appear while tests still pass.

## Explicitly Not Claimed
- No load/performance benchmarking report.
- No penetration testing report.
- No formal accessibility audit report.
- No production hardening certification.