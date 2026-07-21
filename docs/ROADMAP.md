# CareConnect 360 - Build Roadmap

## Phase 1 - Foundation
Install/verify tools, create repository structure, start MySQL, import Maven project, run health endpoint and Swagger.

Exit criteria:
- MySQL container is healthy.
- Backend starts on port 8080.
- /api/public/health returns HTTP 200.
- Swagger UI opens.

## Phase 2 - Domain Model and Database
Create base audit entity, User, Patient, Doctor, InsurancePolicy, Appointment, Claim, Payment, and Notification entities; enums; repositories; constraints; initial admin seeding.

## Phase 3 - Authentication and Authorization
Implement patient registration, login, password hashing, JWT generation/validation, authenticated principal, and role-based route protection.

## Phase 4 - Patient, Doctor, and Insurance
Implement patient profile APIs, admin doctor creation, doctor search, patient insurance submission, and admin activation/deactivation.

## Phase 5 - Appointment Workflow
Implement booking, doctor confirmation/rejection/completion, patient cancellation, time-conflict validation, ownership validation, and appointment notifications.

## Phase 6 - Claims and Copay
Generate one claim automatically after appointment completion, calculate BigDecimal insurance/copay values, and implement admin approval/rejection.

## Phase 7 - Mock Payment
Create idempotent mock copay payment, record success/failure, and move approved claims to PAID only after successful payment.

## Phase 8 - Notifications and Dashboards
Implement in-app event listeners, unread/read operations, patient dashboard aggregation, and admin analytics.

## Phase 9 - React Foundation
Create React TypeScript application, routing, API client, JWT storage, protected routes, layouts, error handling, and shared components.

## Phase 10 - React Business Screens
Build patient, doctor, and admin workflows; forms; tables; notifications; dashboard cards; and charts.

## Phase 11 - Testing and Hardening
Add service unit tests, controller tests, integration tests, validation tests, authorization tests, database constraint tests, and error handling.

## Phase 12 - Documentation and Demo
Finalize README, Swagger examples, Postman collection, screenshots, HLD, LLD, ERD, PPT, GitHub cleanup, and the 12-step presentation demo.
