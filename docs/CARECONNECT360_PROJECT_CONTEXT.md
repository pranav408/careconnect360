# CareConnect 360 — Complete Copilot Project Context

**Checkpoint:** Phase 4B started  
**Purpose:** Source of truth for GitHub Copilot working inside the CareConnect 360 repository.

---

## 1. Project goal

CareConnect 360 is a healthcare and insurance-settlement platform built as a Java full-stack academic project. It demonstrates a complete workflow across patients, doctors, appointments, insurance policies, claims, patient responsibility, mock payments, notifications, and role-specific dashboards.

The final demonstration must support this flow:

1. Patient registers.
2. Patient logs in and receives a JWT.
3. Admin logs in.
4. Admin creates a doctor.
5. Patient submits an insurance policy.
6. Admin activates or rejects the policy.
7. Patient searches doctors.
8. Patient books an appointment.
9. Doctor confirms or rejects it.
10. Doctor completes a confirmed appointment.
11. The system creates one claim for that appointment.
12. Admin verifies and approves or rejects the claim.
13. Patient sees the approved amount and patient responsibility.
14. Patient completes a mock payment.
15. Successful payment changes the claim to `PAID`.
16. Notifications are created during the workflow.
17. Patient and admin dashboards show updated metrics.

---

## 2. Architecture

- Modular monolith.
- One Spring Boot backend.
- One MySQL schema.
- Strong package separation by module.
- REST/JSON integration with React.
- Spring application events planned for notifications.

Modules:

- `auth`
- `patient`
- `doctor`
- `insurance`
- `appointment`
- `claim`
- `payment`
- `notification`
- `dashboard`
- `common`
- `config`

Planned runtime:

```text
React + TypeScript
        |
        | JSON REST + Bearer JWT
        v
Spring Boot modular monolith
        |
        | Spring Data JPA / Hibernate
        v
MySQL 8.4 in Docker
```

Out of scope for the MVP:

- Microservices.
- Kafka or RabbitMQ.
- Redis.
- Kubernetes.
- Real payment gateway.
- SMS.
- Prescriptions or medical records.
- External calendar sync.
- Recurring appointments.

---

## 3. Technology stack

Backend:

- Java Temurin 17.
- Spring Boot 3.5.16.
- Maven.
- Spring Web.
- Spring Data JPA / Hibernate.
- Spring Security.
- BCrypt.
- JJWT 0.13.0.
- Jakarta Bean Validation.
- SpringDoc Swagger/OpenAPI.
- Actuator.
- MySQL Connector/J.
- DevTools for local use.

Database:

- MySQL 8.4 in Docker.
- Host port `3307`.
- Container port `3306`.
- Database `careconnect360`.
- Container `careconnect360-mysql`.
- H2 in-memory database for tests.

Frontend, not yet implemented:

- React.
- TypeScript.
- Vite.

Local paths:

```text
Project root:
/Users/venkatapranavbejagam/Desktop/careconnect360-phase1

Backend:
/Users/venkatapranavbejagam/Desktop/careconnect360-phase1/backend
```

---

## 4. Fixed decisions

1. Java 17 and Spring Boot 3.5.16.
2. Maven backend.
3. Modular monolith.
4. MySQL local host port 3307.
5. Roles: `PATIENT`, `DOCTOR`, `ADMIN`.
6. Public registration is patient-only.
7. Admin is seeded at startup.
8. Only admin creates doctor accounts.
9. `/me` endpoints derive identity from JWT principal.
10. Use `BigDecimal` for money.
11. Appointment conflicts belong in service logic.
12. One claim per appointment.
13. One payment per claim.
14. Payment amount equals patient responsibility.
15. Notification read state is separate from email delivery state.
16. Do not recreate completed entities or repositories without a confirmed defect.
17. Do not return entities, password hashes, tokens, or secrets.
18. Do not commit production credentials.

---

## 5. Completed database model

Eight tables and eight repositories are complete and verified.

### `users`

- Unique email.
- BCrypt password hash.
- Role: `PATIENT`, `DOCTOR`, `ADMIN`.
- Status: `ACTIVE`, `INACTIVE`, `LOCKED`.

### `patients`

- One-to-one with user.
- Unique `user_id`.
- Full name, phone, address, DOB, gender.

Gender values:

- `MALE`
- `FEMALE`
- `OTHER`
- `PREFER_NOT_TO_SAY`

### `doctors`

- One-to-one with user.
- Unique `user_id`.
- Unique license number.
- Full name, specialization, phone, clinic address.
- `BigDecimal` consultation fee.
- Availability flag.

### `insurance_policies`

- Unique policy number.
- Belongs to patient.
- Coverage percentage, deductible, dates, status.

Statuses:

- `PENDING`
- `ACTIVE`
- `REJECTED`
- `EXPIRED`

### `appointments`

- Patient and doctor references.
- Date, time, reason, status.

Statuses:

- `REQUESTED`
- `CONFIRMED`
- `REJECTED`
- `CANCELLED`
- `COMPLETED`

### `claims`

- Unique appointment ID.
- Policy reference.
- Requested amount, approved amount, patient responsibility.
- Optional rejection reason.

Statuses:

- `SUBMITTED`
- `VERIFIED`
- `APPROVED`
- `REJECTED`
- `PAID`

### `payments`

- Unique claim ID.
- Unique transaction reference.
- Amount, paid timestamp, failure reason, status.

Statuses:

- `INITIATED`
- `SUCCESS`
- `FAILED`

### `notifications`

- Recipient.
- Type, title, message.
- Related entity type and ID.
- Read flag and read timestamp.
- Email delivery status, sent time, failure reason.

Notification types:

- `APPOINTMENT`
- `INSURANCE_POLICY`
- `CLAIM`
- `PAYMENT`
- `SYSTEM`

Email states:

- `NOT_REQUESTED`
- `PENDING`
- `SENT`
- `FAILED`

---

## 6. Completed backend phases

### Phase 1 — Foundation

Verified:

- Java, Maven, Docker, and MySQL work.
- Backend starts on port 8080.
- Swagger and Actuator work.
- MySQL persists data.
- Maven tests pass.

### Phase 2 — Entities and repositories

Verified:

- `BaseEntity`.
- Eight entities.
- Eight repositories.
- Eight tables.
- Relationships and constraints.
- Spring finds 8 repositories.

### Phase 3A — Security foundation

Implemented:

- `CustomUserDetailsService`.
- BCrypt encoder.
- `DaoAuthenticationProvider`.
- `AuthenticationManager`.
- Stateless `SecurityFilterChain`.
- CORS for `http://localhost:5173`.
- Public health, Swagger, OpenAPI, login, and patient registration.
- 401 authentication entry point.
- 403 access-denied handler.

The startup warning about a manually configured `AuthenticationProvider` is expected.

### Phase 3B — Patient registration

Implemented:

- `RegisterPatientRequest`.
- `RegisterPatientResponse`.
- `AuthService.registerPatient`.
- `AuthController`.
- Transactional `User` + `Patient` creation.

Verified:

- New patient returns 201.
- Duplicate email returns 409.
- Password stored as BCrypt.
- Patient linked to user.

### Phase 3C — JWT login

Implemented:

- `LoginRequest`.
- `LoginResponse`.
- `CurrentUserResponse`.
- `JwtService`.
- `JwtAuthenticationFilter`.
- `GET /api/auth/me`.

JWT claims:

- `sub`: normalized email.
- `userId`.
- `role`.
- `iat`.
- `exp`.

Verified:

- Correct password returns 200 + JWT.
- Wrong password returns 401.
- `/api/auth/me` without token returns 401.
- `/api/auth/me` with valid token returns 200.

### Phase 4A — Seed administrator

Implemented:

- `app.admin.email` and `app.admin.password` in `application.yml`.
- `AdminDataInitializer` in `com.careconnect360.config`.
- Creates one active admin only when missing.
- BCrypt password.
- No password logging.

Verified:

- Admin row exists.
- Restart does not duplicate it.
- Admin login works.
- Wrong admin password returns 401.

### Phase 4B — Doctor creation started

Already created:

- `com.careconnect360.doctor.dto.CreateDoctorRequest`
- `com.careconnect360.doctor.dto.CreateDoctorResponse`

Request fields:

- `email`
- `password`
- `fullName`
- `specialization`
- `licenseNumber`
- `phone`
- `clinicAddress`
- `consultationFee`

Response fields:

- `userId`
- `doctorId`
- `email`
- `fullName`
- `specialization`
- `licenseNumber`
- `phone`
- `clinicAddress`
- `consultationFee`
- `availableForAppointments`
- `role`
- `status`
- `message`

---

## 7. Existing security contract

Public:

- `POST /api/auth/register/patient`
- `POST /api/auth/login`
- `/api/public/**`
- `/actuator/health`
- `/actuator/health/**`
- `/actuator/info`
- `/swagger-ui/**`
- `/swagger-ui.html`
- `/v3/api-docs/**`
- `OPTIONS /**`

Authenticated:

- `GET /api/auth/me`
- All future business APIs unless role-restricted.

Role convention:

`CustomUserDetailsService` uses `.roles(user.getRole().name())`.

Use:

- `hasRole('PATIENT')`
- `hasRole('DOCTOR')`
- `hasRole('ADMIN')`

Self-service identity rule:

1. Read `Authentication.getName()`.
2. Find user by email.
3. Resolve linked patient or doctor.
4. Do not accept arbitrary user IDs for `/me` operations.

---

## 8. Immediate next milestone — admin creates doctors

Copilot must inspect actual `User`, `Doctor`, `UserRepository`, and `DoctorRepository` before implementation.

Required endpoint:

```http
POST /api/admin/doctors
Authorization: Bearer <ADMIN token>
```

Protection:

```java
@PreAuthorize("hasRole('ADMIN')")
```

Required behavior:

1. Validate request with `@Valid`.
2. Normalize email using `trim().toLowerCase(Locale.ROOT)`.
3. Reject duplicate email.
4. Reject duplicate license case-insensitively.
5. BCrypt hash password.
6. Create `ACTIVE` user with role `DOCTOR`.
7. Create linked doctor.
8. New doctor is available for appointments.
9. Save both in one transaction.
10. Return 201 and `CreateDoctorResponse`.
11. Never return password or hash.

Add repository methods only when missing, for example:

```java
boolean existsByLicenseNumberIgnoreCase(String licenseNumber);
```

Acceptance checks:

- No token -> 401.
- Patient token -> 403.
- Admin token -> 201.
- Duplicate email -> 409.
- Duplicate license -> 409.
- Linked user and doctor rows exist.
- Doctor can log in.
- `/api/auth/me` with doctor JWT returns `DOCTOR`.

---

## 9. Common API foundation after doctor creation

Recommended package:

```text
com.careconnect360.common.exception
```

Recommended classes:

- `ResourceNotFoundException`
- `DuplicateResourceException`
- `BadRequestException`
- `ForbiddenOperationException`
- `InvalidStatusTransitionException`
- `PaymentProcessingException`
- `ApiErrorResponse`
- `GlobalExceptionHandler`

Standard error response:

```json
{
  "timestamp": "2026-07-12T20:00:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "A doctor already exists with this license number",
  "path": "/api/admin/doctors"
}
```

Also add a reusable authenticated-user helper/service. Do not decode JWT manually in controllers.

---

## 10. Remaining backend roadmap

### Phase 5 — Patient, doctor, insurance

Patient:

```text
GET /api/patients/me
PUT /api/patients/me
```

Doctor directory:

```text
GET /api/doctors
GET /api/doctors/{doctorId}
```

Support available-doctor listing, search by name/specialization, pagination, and safe DTOs.

Insurance patient APIs:

```text
POST /api/insurance/policies
GET  /api/insurance/policies/me
GET  /api/insurance/policies/me/active
```

Insurance admin APIs:

```text
GET   /api/admin/insurance/policies
PATCH /api/admin/insurance/policies/{policyId}/activate
PATCH /api/admin/insurance/policies/{policyId}/reject
```

Rules:

- New policy is `PENDING`.
- Patient owns submitted policy.
- Policy number unique.
- Start date before end date.
- Coverage 0 to 100.
- Deductible non-negative.
- Enforce active-policy rule in service.
- Only pending policies may be activated or rejected.

### Phase 6 — Appointments

Patient:

```text
POST  /api/appointments
GET   /api/appointments/me
PATCH /api/appointments/{id}/cancel
```

Doctor:

```text
GET   /api/doctor/appointments
PATCH /api/doctor/appointments/{id}/confirm
PATCH /api/doctor/appointments/{id}/reject
PATCH /api/doctor/appointments/{id}/complete
```

Rules:

- Booking starts `REQUESTED`.
- Patient books only for self.
- Doctor must exist and be available.
- Date/time must be future.
- Prevent doctor time conflicts.
- Only assigned doctor can act.
- Complete only `CONFIRMED`.
- Completion creates at most one claim.

Status flow:

```text
REQUESTED -> CONFIRMED -> COMPLETED
REQUESTED -> REJECTED
REQUESTED or CONFIRMED -> CANCELLED when allowed
```

### Phase 7 — Claims

Patient:

```text
GET /api/claims/me
GET /api/claims/{claimId}
```

Admin:

```text
GET   /api/admin/claims
PATCH /api/admin/claims/{claimId}/verify
PATCH /api/admin/claims/{claimId}/approve
PATCH /api/admin/claims/{claimId}/reject
```

Rules:

- One claim per appointment.
- Created after appointment completion.
- Use active policy.
- Initial status `SUBMITTED`.
- `SUBMITTED -> VERIFIED -> APPROVED` or `REJECTED`.
- Store rejection reason.
- Use `BigDecimal`, scale 2, explicit rounding.
- Divide coverage percentage by 100.

MVP formula unless existing code documents another approved formula:

```text
eligibleAfterDeductible = max(requestedAmount - deductibleAmount, 0)
coverageRate = coveragePercentage / 100
approvedAmount = eligibleAfterDeductible * coverageRate
patientResponsibility = requestedAmount - approvedAmount
```

### Phase 8 — Mock payment

```text
POST /api/payments/claims/{claimId}
GET  /api/payments/me
```

Rules:

- Patient may pay only own claim.
- Claim must be `APPROVED`.
- Amount equals patient responsibility.
- One payment per claim.
- Unique transaction reference.
- Deterministic testable success/failure.
- Success -> payment `SUCCESS`, set paid time, claim `PAID`.
- Failure -> payment `FAILED`, save reason, claim remains `APPROVED`.
- Update transactionally.

### Phase 9 — Notifications

Implement:

- `NotificationService`.
- Business event classes.
- Spring event listeners.
- In-app notifications.
- Optional email adapter.

APIs:

```text
GET   /api/notifications/me
GET   /api/notifications/me/unread-count
PATCH /api/notifications/{id}/read
PATCH /api/notifications/me/read-all
```

Rules:

- User accesses only own notifications.
- Reading sets flag and timestamp.
- Email state remains independent.

### Phase 10 — Dashboards

Patient dashboard:

- Upcoming appointments.
- Claims by status.
- Patient responsibility.
- Payment history.
- Active policy.
- Unread notification count.

Admin dashboard:

- Total patients and doctors.
- Appointments by status.
- Claims by status.
- Policies by status.
- Total successful patient payments.
- Average settlement time if data supports it.

Prefer database aggregation queries or projections.

---

## 11. Frontend roadmap

Start only after essential backend APIs are tested.

Use React + TypeScript + Vite in `frontend`.

Required:

- Login.
- Patient registration.
- Auth context.
- JWT storage suitable for academic MVP.
- API client with bearer token.
- Logout.
- Protected routing.
- Role-based navigation.
- Patient, doctor, and admin dashboards.
- Forms for all workflows.
- Loading, empty, success, and error states.
- Backend validation/error display.
- Accessible UI.
- Charts using real API data.

Suggested routes:

```text
/login
/register
/patient/*
/doctor/*
/admin/*
```

Route based on returned role after login.

---

## 12. Testing and hardening

Minimum tests:

- Service tests for status transitions.
- Financial calculation unit tests.
- Repository query tests.
- Security integration tests for 401, 403, role access.
- Controller tests with MockMvc.
- End-to-end workflow test with H2.
- Duplicate and ownership tests.
- One claim per appointment.
- One payment per claim.

Final hardening:

- Add Flyway migrations.
- Change `ddl-auto=update` to `validate` after migrations.
- Add useful indexes.
- Review lazy loading and DTO mapping.
- Use UTC consistently.
- Add pagination.
- Remove local-only secrets from production config.
- Protect Swagger and Actuator in production.
- Add production-safe CORS.

---

## 13. Run and verify

Start MySQL:

```bash
cd ~/Desktop/careconnect360-phase1
docker compose up -d mysql
docker compose ps
```

Run tests:

```bash
cd ~/Desktop/careconnect360-phase1/backend
mvn clean test
```

Start backend:

```bash
mvn spring-boot:run
```

Useful URLs:

```text
Health:  http://localhost:8080/api/public/health
Actuator: http://localhost:8080/actuator/health
Swagger: http://localhost:8080/swagger-ui.html
OpenAPI: http://localhost:8080/v3/api-docs
```

Verify tables:

```bash
docker exec -it careconnect360-mysql \
mysql -u careconnect -p careconnect360 \
-e "SHOW TABLES;"
```

Never put real passwords or JWTs in source control, docs, logs, screenshots, or fixtures.

Common issues:

- YAML uses spaces, not tabs.
- Do not run backend twice.
- If port 8080 is occupied, stop the old process instead of changing the port.
- Hibernate may emit enum `ALTER TABLE` statements with `ddl-auto=update`.
- Manual `AuthenticationProvider` warning is expected.

---

## 14. Definition of done

Complete only when:

- Full 17-step demo flow works.
- `mvn clean test` passes.
- Backend starts against MySQL.
- Role authorization is verified.
- Frontend calls real APIs.
- No entity is exposed directly.
- No hash, token, or secret is logged or returned.
- README has setup, architecture, run, test, and demo instructions.
- Swagger or Postman documents APIs.
- HLD, LLD, ERD, screenshots, and presentation are prepared.
