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

## 2. Start MySQL Container
- `docker compose up -d mysql`
- `docker compose ps`

Use environment variables for local config where needed:
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 3. Start Backend
- `cd backend`
- `mvn clean compile`
- `mvn spring-boot:run`

Known stale-class fix (when runtime behavior does not match source):
- `mvn clean compile`
- `mvn spring-boot:run`

## 4. Start Frontend
Open a second terminal:
- `cd frontend`
- `npm install`
- `npm run dev`

## 5. Verify Health
- Backend health: `curl http://localhost:8080/actuator/health`
- Frontend URL: `http://localhost:5173`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## 6. Test/Quality Commands
- Backend: `cd backend && mvn clean test`
- Frontend tests: `cd frontend && npm run test`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

## 7. Port Conflict Checks
- Backend 8080: `lsof -i :8080`
- Frontend 5173: `lsof -i :5173`
- MySQL host-mapped 3307: `lsof -i :3307`
- LiveReload 35729: `lsof -i :35729`

If a port is occupied, stop the conflicting process or adjust environment values before restart.

## 8. Shutdown
- Stop frontend dev server: Ctrl+C
- Stop backend server: Ctrl+C
- Stop MySQL container: `docker compose down`

Optional data reset:
- `docker compose down -v` (deletes local DB volume)

## 9. Restart Procedure
- `docker compose up -d mysql`
- `cd backend && mvn spring-boot:run`
- `cd frontend && npm run dev`

## 10. Troubleshooting
- 401/403 on protected APIs: verify Bearer token and role.
- DB connection failures: confirm Docker container health and 3307 availability.
- CORS issues in local dev: ensure frontend runs on `http://localhost:5173`.
- Startup inconsistency after code changes: run stale-class fix sequence above.
- Swagger unavailable: ensure backend started successfully and actuator health is UP.