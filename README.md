# CareConnect360

CareConnect360 is a healthcare workflow platform MVP that connects patient intake, insurance validation, appointment operations, claims processing, mock payments, and notifications in one role-secured system.

## Business Problem
Healthcare workflows are often fragmented across separate portals and manual handoffs. This causes delayed claim settlement, unclear patient responsibility, and poor operational visibility.

## Solution Overview
CareConnect360 provides a modular monolith with explicit state transitions and role-based workflows across PATIENT, DOCTOR, and ADMIN users. It centralizes the lifecycle from registration to claim payment status updates.

## User Roles
- PATIENT: self-registration, profile, insurance submission, appointments, claims, mock payments, notifications.
- DOCTOR: appointment decision/completion workflow and self-profile.
- ADMIN: doctor creation, insurance decisions, claim decisions, operational dashboards.

## Major Features
- JWT authentication and role-based authorization.
- Patient-only public registration.
- Admin-created doctor accounts.
- Insurance status lifecycle: PENDING -> ACTIVE/REJECTED.
- Appointment lifecycle: REQUESTED -> CONFIRMED/REJECTED, and completion.
- Automatic claim creation when a confirmed appointment is completed.
- Claim lifecycle: SUBMITTED -> VERIFIED -> APPROVED/REJECTED -> PAID.
- Mock payment workflow (not a real payment gateway) with claim PAID transition on SUCCESS.
- Patient notification center with unread counters and mark-as-read operations.
- Patient and admin dashboard aggregates.

## Verified Technology Stack
- Backend: Java 17, Spring Boot 3.5.16, Maven, Spring Web, Spring Data JPA/Hibernate, Spring Security, Bean Validation, JWT (jjwt), SpringDoc OpenAPI, Actuator.
- Frontend: React, TypeScript, Vite, React Router, Axios, MUI.
- Database: MySQL 8.4 (Docker for local runtime), H2 for backend tests.

## Architecture Summary
- Modular monolith backend with controller/service/repository layering.
- React SPA frontend calling REST APIs with Bearer JWT.
- Local Vite dev proxy from /api to backend at localhost:8080.
- MySQL containerized for local development.

## Frontend API Base URL Configuration
- `VITE_API_BASE_URL` is the complete API root used by the frontend at build time.
- Default/fallback behavior is `/api` when the variable is missing, undefined, empty, or whitespace-only.
- Valid values:
   - `/api`
   - `https://api.example.com/api`
   - `https://example.com/careconnect/api`
- Invalid values are rejected during frontend initialization:
   - absolute origin without `/api` path (for example `https://api.example.com`)
   - unsupported protocol
   - query strings or fragments

Deployment models:
- Local development: keep `VITE_API_BASE_URL` unset or `/api`; Vite proxy forwards `/api` to `http://localhost:8080`.
- Same-origin production: keep `VITE_API_BASE_URL` unset or `/api`; edge/reverse proxy routes `/api` to backend.
- Split-origin production: set `VITE_API_BASE_URL=https://api.example.com/api`; backend `APP_CORS_ALLOWED_ORIGINS` must include the exact frontend origin.

Security note:
- Never place passwords, JWT secrets, tokens, database credentials, or private keys in `VITE_*` variables because they are embedded into the browser bundle.
- Changing `VITE_API_BASE_URL` requires rebuilding and redeploying the frontend.

## Application Modules
- auth
- patient
- doctor
- insurance
- appointment
- claim
- payment
- notification
- dashboard
- common/config

## Workflow Summary
Patient registers and submits insurance, admin activates policy, patient books an appointment, doctor confirms and completes, claim is auto-created, admin verifies/approves, patient makes mock payment, claim transitions to PAID, and notifications track key events.

## Local Prerequisites
- Java 17
- Maven
- Node.js and npm
- Docker Desktop
- Git

## Local Startup
1. Start MySQL container:
   - `docker compose up -d mysql`
2. Start backend:
   - `cd backend`
   - `mvn clean compile`
   - `mvn spring-boot:run`
3. Start frontend in a second terminal:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Test and Quality Commands
- Backend tests: `cd backend && mvn clean test`
- Frontend tests: `cd frontend && npm run test`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

## Verified Results
- Backend tests: 188 passed.
- Frontend tests: 203 passed.
- Frontend lint: passed.
- Frontend build: passed.
- Full manual E2E role workflow: passed.
- Duplicate-claim and duplicate-successful-payment integrity checks: passed.

## Demo Credentials
Use local seeded/admin and test users without exposing real passwords in shared materials.
- Example placeholders: `<ADMIN_EMAIL>`, `<ADMIN_PASSWORD>`, `<PATIENT_EMAIL>`, `<PATIENT_PASSWORD>`, `<DOCTOR_EMAIL>`, `<DOCTOR_PASSWORD>`.

## Screenshots
See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) and store captures under [docs/screenshots](docs/screenshots).

## Documentation Index
- [Architecture](docs/ARCHITECTURE.md)
- [ER Diagram](docs/ER_DIAGRAM.md)
- [Features and Roles](docs/FEATURES_AND_ROLES.md)
- [API Overview](docs/API_OVERVIEW.md)
- [Local Setup](docs/LOCAL_SETUP.md)
- [Demo Guide](docs/DEMO_GUIDE.md)
- [Testing and Regression](docs/TESTING_AND_REGRESSION.md)
- [Screenshot Guide](docs/SCREENSHOTS.md)
- [Portfolio and Interview Guide](docs/PORTFOLIO_AND_INTERVIEW_GUIDE.md)
- [Project Context Source of Truth](docs/CARECONNECT360_PROJECT_CONTEXT.md)

## Current Limitations
- MVP scope only; not production-hardened.
- Payment is a deterministic mock flow only.
- No deployment pipeline, CI/CD, Flyway migrations, or cloud hosting documented yet.
- No admin endpoints for doctor editing, doctor account-status management, or doctor availability management.

## Planned Engineering Hardening
- Externalized secret management and environment segregation.
- Observability expansion (structured logs, metrics dashboards, alerting).
- API contract/version governance and expanded integration tests.
- Data migration/versioning strategy.
- Performance, resilience, and security hardening test suites.

## Portfolio and Interview Summary
CareConnect360 demonstrates full-stack Java architecture design, JWT/RBAC security, transactional healthcare-state workflows, BigDecimal-safe financial calculations, and strong regression discipline in an end-to-end business domain scenario.