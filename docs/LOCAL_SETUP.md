# Local Setup (macOS)

## Prerequisites
- Java 17
- Maven 3.9+
- Node.js + npm
- Docker Desktop
- Git
- Optional IDEs: VS Code, Eclipse

## Project Layout
- backend: Spring Boot API
- frontend: React + Vite app
- docs: project documentation
- docker-compose.yml: local MySQL runtime

## 1. Clone and Enter Project
- `git clone <REPO_URL>`
- `cd careconnect360-phase1`

## 2. Create Local Environment File
- `cp .env.example .env`
- Edit `.env` with your local values before startup.

## 3. Start MySQL Container
- `docker compose up -d mysql`
- `docker compose ps`

Use environment variables for local config where needed:
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION_MS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FLYWAY_ENABLED`
- `FLYWAY_BASELINE_ON_MIGRATE`

Local profile defaults:
- `SPRING_PROFILES_ACTIVE=local`
- `APP_DOCS_ENABLED=true`
- `APP_ADMIN_BOOTSTRAP_ENABLED=false` (admin bootstrap is off unless explicitly enabled)
- `APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

## 4. Start Backend
- `cd backend`
- `mvn clean compile`
- `mvn spring-boot:run`

Known stale-class fix (when runtime behavior does not match source):
- `mvn clean compile`
- `mvn spring-boot:run`

## 5. Start Frontend
Open a second terminal:
- `cd frontend`
- `npm install`
- `npm run dev`

## 6. Verify Health
- Backend health: `curl http://localhost:8080/actuator/health`
- Frontend URL: `http://localhost:5173`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

Local CORS note:
- Both local frontend origins are supported by default: `http://localhost:5173` and `http://127.0.0.1:5173`.
- Use `APP_CORS_ALLOWED_ORIGINS` to override as a comma-separated exact-origin list.

## 7. Test/Quality Commands
- Backend: `cd backend && mvn clean test`
- Frontend tests: `cd frontend && npm run test`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

## 8. Port Conflict Checks
- Backend 8080: `lsof -i :8080`
- Frontend 5173: `lsof -i :5173`
- MySQL host-mapped 3307: `lsof -i :3307`
- LiveReload 35729: `lsof -i :35729`

If a port is occupied, stop the conflicting process or adjust environment values before restart.

## 9. Shutdown
- Stop frontend dev server: Ctrl+C
- Stop backend server: Ctrl+C
- Stop MySQL container: `docker compose down`

Optional data reset:
- `docker compose down -v` (deletes local DB volume)

## 10. Restart Procedure
- `docker compose up -d mysql`
- `cd backend && mvn spring-boot:run`
- `cd frontend && npm run dev`

## 11. Troubleshooting
- 401/403 on protected APIs: verify Bearer token and role.
- DB connection failures: confirm Docker container health and 3307 availability.
- CORS issues in local dev: ensure frontend runs on `http://localhost:5173` or `http://127.0.0.1:5173`.
- Startup inconsistency after code changes: run stale-class fix sequence above.
- Swagger unavailable: ensure backend started successfully and actuator health is UP.

## Controlled Admin Bootstrap
- Administrator bootstrap is an explicit setup operation controlled by `APP_ADMIN_BOOTSTRAP_ENABLED`.
- Keep bootstrap disabled (`false`) for normal local development and after an administrator already exists.
- When enabling bootstrap, provide nonblank `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- After bootstrap succeeds, set `APP_ADMIN_BOOTSTRAP_ENABLED=false` again.

## 12. Flyway Phase A Database Paths

Existing database path (preserve current local data):
1. Back up the database before first Flyway startup.
2. Set `FLYWAY_BASELINE_ON_MIGRATE=true` in local `.env` for one startup only.
3. Start backend: `cd backend && mvn spring-boot:run`.
4. Confirm `flyway_schema_history` was created.
5. Stop backend.
6. Set `FLYWAY_BASELINE_ON_MIGRATE=false` again.
7. Restart backend and confirm startup validation succeeds.

Empty database path (new environment):
1. Create a brand-new empty MySQL database.
2. Keep `FLYWAY_BASELINE_ON_MIGRATE=false`.
3. Start backend and let Flyway run `V1__baseline_schema.sql`.
4. Confirm all baseline tables were created and Hibernate validation succeeds.

Rollback and migration safety:
1. Rollback is done by restoring the pre-Flyway backup, not by editing an applied migration.
2. Never edit an applied versioned migration.
3. Add new changes as `V2`, `V3`, and later migrations.
4. Do not use Flyway clean on valuable databases.

## 13. Flyway Phase B (V2) Notes
- `V2__schema_hardening.sql` adds a generated nullable `insurance_policies.active_patient_id` plus unique index `uk_insurance_policies_active_patient` to enforce one `ACTIVE` policy per patient at database level.
- `V2` also adds performance indexes `idx_appointments_doctor_status_date_time`, `idx_appointments_patient_status_date_time`, and `idx_payments_status_created_at`.
- Never edit `V1` or `V2` after either migration is applied in any environment.
- All future schema changes must be introduced as `V3` or later migrations.