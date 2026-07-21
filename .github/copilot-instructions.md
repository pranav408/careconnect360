# CareConnect 360 Repository Instructions

Treat `docs/CARECONNECT360_PROJECT_CONTEXT.md` as the project source of truth. Before editing, inspect the existing workspace and preserve all verified code unless a confirmed defect requires a change.

## Non-negotiable architecture

- Java 17, Spring Boot 3.5.16, Maven.
- Modular monolith; do not convert this project to microservices.
- MySQL 8.4 in Docker for local runtime; H2 for tests.
- Spring Data JPA/Hibernate, Spring Security, BCrypt, JWT, SpringDoc/OpenAPI, Actuator.
- Planned frontend: React + TypeScript + Vite.
- Roles: `PATIENT`, `DOCTOR`, `ADMIN`.
- Public self-registration is only for patients.
- The backend seeds one admin account; only admins create doctor accounts.
- `/me` APIs derive identity from the authenticated JWT principal.
- Use `BigDecimal` for all money and percentage calculations.
- Never return JPA entities directly from controllers; use request/response DTOs.
- Do not expose passwords, password hashes, JWT secrets, or real access tokens.
- Do not add Kafka, RabbitMQ, Redis, Kubernetes, real payment gateways, SMS, prescriptions, or medical-record modules to the MVP.

## Current checkpoint

Completed and verified:

- Environment and database foundation.
- Eight entities, eight repositories, eight MySQL tables, relationships, and constraints.
- Patient registration.
- BCrypt password storage.
- Login and JWT issuance.
- JWT authentication filter.
- Protected `GET /api/auth/me`.
- Seeded active administrator and verified administrator login.
- `CreateDoctorRequest` and `CreateDoctorResponse` DTOs.

Immediate next work: finish administrator-created doctor accounts.

## Coding rules

- Inspect existing entity constructors, getters, setters, repository methods, package names, and configuration before writing code.
- Extend existing files rather than recreating them.
- Normalize emails with `trim().toLowerCase(Locale.ROOT)`.
- Use constructor injection.
- Use `@Transactional` for multi-record workflows.
- Use `@Valid` and Jakarta Bean Validation.
- Use `@PreAuthorize` for role checks.
- Use standard HTTP semantics: 201 create, 200 read/update, 204 delete when appropriate, 400 validation/business input, 401 unauthenticated, 403 unauthorized, 404 missing resource, 409 duplicate/conflict.
- Keep controllers thin; business rules belong in services.
- Keep entity-to-DTO mapping explicit and avoid lazy-loading leaks.
- Use strict, tested status transitions.
- Do not silently alter existing database constraints.
- Never use floating-point types for financial calculations.
- Never log credentials or tokens.
- Use spaces, never tab characters, in YAML.

## Verification rules

After each coherent milestone:

1. Run `mvn clean test` from `backend`.
2. Confirm the application starts on port 8080.
3. Confirm Spring finds 8 repositories.
4. Test the API through Swagger or `curl`.
5. Verify important database rows/constraints in MySQL.
6. Report changed files, tests run, and any unresolved issue.
7. Do not continue after a failing build until the failure is fixed.

Do not generate the entire remaining application as one uncontrolled patch. Implement in the ordered phases in the project context, keeping the workspace buildable at every checkpoint.
