# API Overview

Base URL (local): `http://localhost:8080`
Auth: Bearer JWT (except public auth endpoints).
Swagger/OpenAPI (local): `/swagger-ui.html` and `/v3/api-docs`.

## Endpoint Families

## Authentication
- `POST /api/auth/register/patient`
  - Role: Public
  - Purpose: Register patient user + profile
  - Request DTO: RegisterPatientRequest
  - Response DTO: RegisterPatientResponse
  - Status: 201, 400, 409
- `POST /api/auth/login`
  - Role: Public
  - Purpose: Authenticate and issue JWT
  - Request DTO: LoginRequest
  - Response DTO: LoginResponse
  - Status: 200, 400, 401
- `GET /api/auth/me`
  - Role: Authenticated
  - Purpose: Resolve current principal details
  - Request DTO: none
  - Response DTO: CurrentUserResponse
  - Status: 200, 401

## Patient Profile
- `GET /api/patients/me`
  - Role: PATIENT
  - Purpose: Get own profile
  - Request DTO: none
  - Response DTO: PatientProfileResponse
  - Status: 200, 401, 403, 404
- `PUT /api/patients/me`
  - Role: PATIENT
  - Purpose: Update own profile
  - Request DTO: UpdatePatientProfileRequest
  - Response DTO: PatientProfileResponse
  - Status: 200, 400, 401, 403, 404

## Doctors (Directory)
- `GET /api/doctors`
  - Role: PATIENT, DOCTOR, ADMIN
  - Purpose: Search/list doctors
  - Request DTO: query params
  - Response DTO: Page<DoctorProfileResponse>
  - Status: 200, 400, 401
- `GET /api/doctors/{doctorId}`
  - Role: PATIENT, DOCTOR, ADMIN
  - Purpose: View doctor detail
  - Request DTO: path param
  - Response DTO: DoctorProfileResponse
  - Status: 200, 401, 404

## Doctor Self-Profile
- `GET /api/doctors/me`
  - Role: DOCTOR
  - Purpose: Get own doctor profile
  - Request DTO: none
  - Response DTO: DoctorSelfProfileResponse
  - Status: 200, 401, 403, 404
- `PUT /api/doctors/me`
  - Role: DOCTOR
  - Purpose: Update own doctor profile
  - Request DTO: UpdateDoctorSelfProfileRequest
  - Response DTO: DoctorSelfProfileResponse
  - Status: 200, 400, 401, 403, 404

## Appointments (Patient)
- `POST /api/appointments`
  - Role: PATIENT
  - Purpose: Create appointment request
  - Request DTO: CreateAppointmentRequest
  - Response DTO: AppointmentResponse
  - Status: 201, 400, 401, 403, 404, 409
- `GET /api/appointments/me`
  - Role: PATIENT
  - Purpose: List own appointments
  - Request DTO: query params
  - Response DTO: Page<AppointmentResponse>
  - Status: 200, 400, 401, 403
- `PATCH /api/appointments/{appointmentId}/cancel`
  - Role: PATIENT
  - Purpose: Cancel own requested/confirmed appointment
  - Request DTO: none
  - Response DTO: AppointmentResponse
  - Status: 200, 401, 403, 404, 409

## Doctor Appointments
- `GET /api/doctor/appointments`
  - Role: DOCTOR
  - Purpose: List assigned appointments
  - Request DTO: query params
  - Response DTO: Page<AppointmentResponse>
  - Status: 200, 400, 401, 403
- `PATCH /api/doctor/appointments/{appointmentId}/confirm`
  - Role: DOCTOR
  - Purpose: Confirm REQUESTED appointment
  - Request DTO: none
  - Response DTO: AppointmentResponse
  - Status: 200, 401, 403, 404, 409
- `PATCH /api/doctor/appointments/{appointmentId}/reject`
  - Role: DOCTOR
  - Purpose: Reject REQUESTED appointment
  - Request DTO: none
  - Response DTO: AppointmentResponse
  - Status: 200, 401, 403, 404, 409
- `PATCH /api/doctor/appointments/{appointmentId}/complete`
  - Role: DOCTOR
  - Purpose: Complete CONFIRMED appointment (triggers claim creation)
  - Request DTO: none
  - Response DTO: AppointmentResponse
  - Status: 200, 401, 403, 404, 409

## Insurance (Patient)
- `POST /api/insurance/policies`
  - Role: PATIENT
  - Purpose: Submit policy as PENDING
  - Request DTO: CreateInsurancePolicyRequest
  - Response DTO: InsurancePolicyResponse
  - Status: 201, 400, 401, 403, 409
- `GET /api/insurance/policies/me`
  - Role: PATIENT
  - Purpose: List own policies
  - Request DTO: none
  - Response DTO: List<InsurancePolicyResponse>
  - Status: 200, 401, 403
- `GET /api/insurance/policies/me/active`
  - Role: PATIENT
  - Purpose: Get own active policy
  - Request DTO: none
  - Response DTO: InsurancePolicyResponse
  - Status: 200, 401, 403, 404

## Insurance (Admin)
- `GET /api/admin/insurance/policies`
  - Role: ADMIN
  - Purpose: List/filter policies
  - Request DTO: query params
  - Response DTO: Page<InsurancePolicyResponse>
  - Status: 200, 401, 403
- `PATCH /api/admin/insurance/policies/{policyId}/activate`
  - Role: ADMIN
  - Purpose: Activate pending policy
  - Request DTO: none
  - Response DTO: InsurancePolicyResponse
  - Status: 200, 401, 403, 404, 409
- `PATCH /api/admin/insurance/policies/{policyId}/reject`
  - Role: ADMIN
  - Purpose: Reject pending policy
  - Request DTO: RejectInsurancePolicyRequest
  - Response DTO: InsurancePolicyResponse
  - Status: 200, 400, 401, 403, 404, 409

## Claims (Patient)
- `GET /api/claims/me`
  - Role: PATIENT
  - Purpose: List own claims
  - Request DTO: query params
  - Response DTO: Page<ClaimResponse>
  - Status: 200, 400, 401, 403
- `GET /api/claims/{claimId}`
  - Role: PATIENT
  - Purpose: Get own claim detail
  - Request DTO: path param
  - Response DTO: ClaimResponse
  - Status: 200, 401, 403, 404

## Claims (Admin)
- `GET /api/admin/claims`
  - Role: ADMIN
  - Purpose: List/filter claims
  - Request DTO: query params
  - Response DTO: Page<ClaimResponse>
  - Status: 200, 400, 401, 403
- `PATCH /api/admin/claims/{claimId}/verify`
  - Role: ADMIN
  - Purpose: SUBMITTED -> VERIFIED
  - Request DTO: none
  - Response DTO: ClaimResponse
  - Status: 200, 401, 403, 404, 409
- `PATCH /api/admin/claims/{claimId}/approve`
  - Role: ADMIN
  - Purpose: VERIFIED -> APPROVED with financial calculation
  - Request DTO: none
  - Response DTO: ClaimResponse
  - Status: 200, 401, 403, 404, 409
- `PATCH /api/admin/claims/{claimId}/reject`
  - Role: ADMIN
  - Purpose: VERIFIED -> REJECTED
  - Request DTO: RejectClaimRequest
  - Response DTO: ClaimResponse
  - Status: 200, 400, 401, 403, 404, 409

## Payments (Patient, Mock)
- `POST /api/payments/claims/{claimId}`
  - Role: PATIENT
  - Purpose: Process mock payment for APPROVED claim
  - Request DTO: MockPaymentRequest
  - Response DTO: PaymentResponse
  - Status: 200, 400, 401, 403, 404, 409
- `GET /api/payments/me`
  - Role: PATIENT
  - Purpose: List own payments
  - Request DTO: query params
  - Response DTO: Page<PaymentResponse>
  - Status: 200, 400, 401, 403

## Notifications (Patient)
- `GET /api/notifications/me`
  - Role: PATIENT
  - Purpose: List own notifications with filters
  - Request DTO: query params
  - Response DTO: Page<NotificationResponse>
  - Status: 200, 400, 401, 403
- `GET /api/notifications/me/unread-count`
  - Role: PATIENT
  - Purpose: Unread notification count
  - Request DTO: none
  - Response DTO: UnreadNotificationCountResponse
  - Status: 200, 401, 403
- `PATCH /api/notifications/{notificationId}/read`
  - Role: PATIENT
  - Purpose: Mark one notification as read
  - Request DTO: none
  - Response DTO: NotificationResponse
  - Status: 200, 401, 403, 404
- `PATCH /api/notifications/me/read-all`
  - Role: PATIENT
  - Purpose: Mark all unread as read
  - Request DTO: none
  - Response DTO: MarkAllNotificationsReadResponse
  - Status: 200, 401, 403

## Dashboards
- `GET /api/dashboard/patient`
  - Role: PATIENT
  - Purpose: Aggregated patient dashboard
  - Request DTO: none
  - Response DTO: PatientDashboardResponse
  - Status: 200, 401, 403, 404
- `GET /api/dashboard/admin`
  - Role: ADMIN
  - Purpose: Aggregated system dashboard
  - Request DTO: none
  - Response DTO: AdminDashboardResponse
  - Status: 200, 401, 403

## Admin Doctor Creation
- `POST /api/admin/doctors`
  - Role: ADMIN
  - Purpose: Create doctor user + profile
  - Request DTO: CreateDoctorRequest
  - Response DTO: CreateDoctorResponse
  - Status: 201, 400, 401, 403, 409

## Notes
- `/me` endpoints derive identity from authenticated JWT principal.
- Controllers use DTO contracts; entities are not returned directly.
- No real payment gateway integration is implemented; payment endpoint is a mock workflow.