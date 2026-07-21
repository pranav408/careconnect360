# 10-15 Minute Demo Guide

## Demo Principles
- Use placeholder credentials only: `<ADMIN_EMAIL>`, `<ADMIN_PASSWORD>`, `<PATIENT_EMAIL>`, `<PATIENT_PASSWORD>`, `<DOCTOR_EMAIL>`, `<DOCTOR_PASSWORD>`.
- Use unique test data per run (policy numbers, appointment times, references).
- Do not show passwords, JWT values, or personal real-world data.

## Suggested Flow
1. Architecture intro (1 minute)
- Explain React frontend, Spring Boot backend, MySQL, JWT + RBAC, modular monolith.

2. Admin dashboard (1 minute)
- Show operational summary metrics and role-protected access.

3. Admin creates doctor (1 minute)
- Create a doctor account/profile using admin workflow.

4. Patient registration and profile (1 minute)
- Register patient, login, and show patient profile/dashboard.

5. Patient insurance submission (1 minute)
- Submit a policy (status starts PENDING).

6. Admin activates policy (1 minute)
- Switch to admin and activate policy.
- Transition shown: PENDING -> ACTIVE.

7. Patient books appointment (1 minute)
- Request appointment with active doctor.
- Initial transition: REQUESTED.

8. Doctor confirms and completes (1-2 minutes)
- Doctor confirms then completes appointment.
- Transitions: REQUESTED -> CONFIRMED -> COMPLETED.

9. Automatic claim creation (1 minute)
- Show claim appears for completed appointment.
- Initial claim transition: SUBMITTED.

10. Admin verifies and approves claim (1 minute)
- Admin performs claim review transitions.
- Transitions: SUBMITTED -> VERIFIED -> APPROVED.

11. Patient mock payment (1 minute)
- Patient pays approved claim with mock success.
- Payment transition: INITIATED -> SUCCESS.

12. Claim becomes PAID (30 seconds)
- Confirm claim status transition: APPROVED -> PAID.

13. Notifications workflow (1 minute)
- Show patient notifications and mark-read behavior.

14. Security and route protection (1 minute)
- Demonstrate role-route restrictions and API authorization behavior.

15. Quality summary (30 seconds)
- Mention verified automated and manual regression outcomes.

## Expected Status Transitions
- Insurance: PENDING -> ACTIVE (or REJECTED)
- Appointment: REQUESTED -> CONFIRMED -> COMPLETED (or REQUESTED -> REJECTED/CANCELLED)
- Claim: SUBMITTED -> VERIFIED -> APPROVED -> PAID (or VERIFIED -> REJECTED)
- Payment: INITIATED -> SUCCESS or FAILED

## Demo Data Convention
- Policy numbers: `POL-DEMO-<YYYYMMDD>-<NN>`
- Appointment reason tags: `DEMO-RUN-<NN>`
- Keep one run sheet to avoid collisions with earlier records.

## Backup Path if Time Is Tight
- Show prepared records for each stage and focus on transitions, security boundaries, and integrity rules.