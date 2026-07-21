# CareConnect 360 - Locked Technical Decisions

1. Architecture: modular monolith.
2. Backend: Java 17, Spring Boot 3.5.x, Maven.
3. Frontend: React with TypeScript and Vite.
4. Database: MySQL.
5. Authentication: Spring Security with JWT.
6. API documentation: springdoc-openapi / Swagger UI.
7. Money: BigDecimal only, scale 2, HALF_UP rounding.
8. Patient registration: public self-registration.
9. Admin account: seeded by backend configuration/data migration.
10. Doctor account: admin creates both login account and doctor profile.
11. Insurance: patient submits policy as INACTIVE; admin activates it.
12. Notifications: in-app notifications are MVP; email is optional later.
13. Claim formula: insuranceAmount = fee * coveragePercentage / 100.
14. Protected self-service APIs use authenticated user identity instead of accepting arbitrary user IDs.
15. Appointment completion and claim generation happen in one transaction.
16. One appointment can create at most one claim.
17. One claim can have at most one successful payment.
