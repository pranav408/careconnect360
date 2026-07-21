# Portfolio and Interview Guide

## 30-Second Explanation
CareConnect360 is a Java full-stack healthcare workflow MVP that integrates patient registration, insurance approval, appointment operations, automatic claim creation, mock payments, and notifications in one role-secured modular monolith. It emphasizes JWT authentication, RBAC, strict status transitions, and BigDecimal-safe financial calculations.

## 2-Minute Explanation
The system uses a React + TypeScript frontend and a Spring Boot backend with MySQL. PATIENT users register and manage insurance, appointments, claims, payments, and notifications. DOCTOR users manage assigned appointments and profile data. ADMIN users create doctors and operate insurance/claim review workflows. The backend is layered (controller-service-repository), DTO-driven, and secured with JWT plus method-level role checks. Key workflow guarantees include one claim per completed appointment and duplicate payment prevention per claim. A successful mock payment transitions the claim to PAID and triggers notification updates.

## Detailed Technical Explanation
- Architecture decisions:
  - Modular monolith for clear domain boundaries without distributed-system overhead.
  - Spring Security stateless JWT for sessionless API security.
  - DTO-only API contracts to avoid entity leakage.
- Security model:
  - Login issues Bearer token.
  - JwtAuthenticationFilter resolves principal on protected requests.
  - `@PreAuthorize` enforces role-specific access.
  - `/me` endpoints use authenticated principal identity, not client-supplied user IDs.
- Domain workflows:
  - Appointment: REQUESTED -> CONFIRMED/REJECTED -> COMPLETED.
  - Claim: SUBMITTED -> VERIFIED -> APPROVED/REJECTED -> PAID.
  - Payment: INITIATED -> SUCCESS/FAILED.
- Transactional logic:
  - Completing a confirmed appointment triggers claim creation.
  - Successful mock payment sets payment SUCCESS and claim PAID in one workflow boundary.
- Financial correctness:
  - BigDecimal used for consultation fees, coverage calculations, approved amounts, and patient responsibility.
  - Floating-point drift is avoided for money/percentage operations.
- Notification architecture:
  - Domain events write notification rows for appointment/claim/payment milestones.
  - Read/unread tracking supports user inbox workflows.

## Business Problem and Solution
- Problem: fragmented healthcare administration causes delays, confusion, and poor visibility.
- Solution: one secure workflow platform with explicit handoffs among patient, doctor, and admin actors.

## Challenges Solved
- Enforcing role-appropriate API boundaries.
- Preventing duplicate claim/payment records.
- Preserving strict status transition rules across modules.
- Keeping financial logic deterministic with BigDecimal.

## Testing Strategy Talking Points
- Backend controller/service/security tests across all core modules.
- Frontend API and page/route behavior tests.
- End-to-end manual regression through complete business flow.
- Integrity checks for duplicate claim and payment-success constraints.

## Current Limitations
- MVP scope and local-dev orientation.
- Mock payment flow only (no real gateway).
- No CI/CD, Flyway migration pipeline, cloud deployment, or Kubernetes implementation in this repository.

## Production-Hardening Roadmap (Planned, Not Yet Implemented)
- Secret management and environment isolation.
- Expanded observability and alerting.
- Migration/versioning governance.
- Performance and resilience testing.
- Broader security hardening and compliance-focused reviews.

## Interview Q&A Anchors
- Why modular monolith first? Faster delivery and easier consistency for this domain stage.
- How is RBAC enforced? JWT principal + method-level guards.
- How is claim/payment integrity enforced? Unique constraints plus service-level duplicate checks.
- Why BigDecimal? Monetary and percentage precision with deterministic rounding behavior.