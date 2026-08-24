# Stakeholder Audit Report — Galaxium Travels

**Prepared for:** Engineering Leadership & Security Review  
**Source documents:** [`code-quality-summary.md`](code-quality-summary.md), [`dependency-audit.md`](dependency-audit.md), [`technical-debt-assessment.md`](technical-debt-assessment.md)  
**Note:** `compliance-documentation.md` was referenced in the audit brief but does not exist in this repository. No compliance findings are included.

---

## 1. Executive Summary

Galaxium Travels is a functional demo-grade booking application. The backend (FastAPI + FastMCP, Python) and frontend (React 19, TypeScript) are cleanly structured with a well-defined service layer, consistent error-response conventions, and a working backend test suite. However, the application has **not been designed for production operation** and carries a concentration of critical risks that would make any production deployment unsafe in its current state.

The most severe risks are security-structural: the entire API — both REST endpoints and MCP tools — is publicly accessible with no authentication or authorisation of any kind. User email addresses are stored in browser `localStorage` in plaintext, creating a GDPR-relevant PII exposure on every client. Compound this with the absence of TLS configuration, no input length constraints, and CORS fully open to all origins, and the attack surface is effectively unlimited. These are not configuration oversights — they are absent from the codebase entirely.

Operationally, the application has no CI/CD pipeline, no container orchestration definition, no structured logging, and non-reproducible Python builds due to completely unpinned dependencies. A referenced third service (`booking_system_inventory_hold_service`) does not exist in the repository at all, meaning the full intended architecture is unimplemented. The highest-priority remediation categories, in order, are: **Security** (authentication, PII handling, TLS), **Operational Readiness** (CI/CD, containerisation, logging, dependency locking), and **Architecture** (database strategy, missing service).

---

## 2. Production Readiness Scorecard

| Dimension | RAG | Rationale |
|---|---|---|
| **Authentication** | 🔴 Red | Zero authentication on all REST endpoints and MCP tools. Any caller with network access can book or cancel on behalf of any user. |
| **Data Protection** | 🔴 Red | User PII (email) stored in `localStorage` plaintext. No TLS. No input length constraints. CORS open to all origins. |
| **Observability** | 🔴 Red | No logging in any backend module. No correlation IDs. No metrics. No error monitoring. Only output is a `print()` in `seed.py`. |
| **Dependency Health** | 🟡 Amber | Frontend has a committed `package-lock.json` (positive). All 10 Python dependencies are fully unpinned with no lockfile. No vulnerability scanning pipeline exists for either service. |
| **Test Coverage** | 🟡 Amber | Backend has 24 tests covering service and REST layers well. Frontend has zero tests. MCP tools untested. No E2E tests. |
| **Operational Readiness** | 🔴 Red | No CI/CD, no `docker-compose.yml`, frontend has no Dockerfile, backend Dockerfile has a port mismatch bug, `seed.py` wipes the database on every restart. |

---

## 3. Critical and High Findings — Consolidated

> For full descriptions and evidence references, see the detailed audit documents linked above.

| Sev | Category | Finding | Affected Component | Effort |
|---|---|---|---|---|
| 🔴 CRITICAL | Architecture | Missing inventory hold service — entire service topology absent | `booking_system_inventory_hold_service/` (absent) | MONTHS |
| 🔴 CRITICAL | Security | No authentication or authorisation on any REST endpoint or MCP tool | `server.py` all routes and tools | WEEKS |
| 🔴 CRITICAL | Security | Full user PII (email) stored in `localStorage` in plaintext | `src/hooks/useUser.tsx:26` | DAYS |
| 🔴 CRITICAL | Operational | No CI/CD pipeline — no automated tests, builds, scans, or deploys | `.github/workflows/` (absent) | WEEKS |
| 🔴 CRITICAL | Operational | No container orchestration — no `docker-compose.yml`, no frontend Dockerfile | repository root | WEEKS |
| 🟠 HIGH | Architecture | REST routes and MCP tools co-located in a single monolithic file | `server.py` | WEEKS |
| 🟠 HIGH | Architecture | No separation between runtime and test dependencies in production image | `requirements.txt`, `Dockerfile` | WEEKS |
| 🟠 HIGH | Architecture | SQLite with no migration strategy — cannot scale or evolve schema | `db.py`, `models.py` | WEEKS |
| 🟠 HIGH | Security | No input length or content constraints on string fields | `schemas.py`, `services/user.py`, `services/booking.py` | WEEKS |
| 🟠 HIGH | Security | `VITE_API_URL` fallback hardcoded to wrong port (8080 vs 8081) | `src/services/api.ts:13` | DAYS |
| 🟠 HIGH | Operational | No structured logging anywhere in the backend | `server.py`, all `services/` files | WEEKS |
| 🟠 HIGH | Operational | Backend Dockerfile `EXPOSE 8080` mismatches actual bind port 8081 | `Dockerfile:5`, `server.py:190` | DAYS |
| 🟠 HIGH | Operational | Health check returns OK unconditionally — does not probe database | `server.py:133–136` | WEEKS |
| 🟠 HIGH | Operational | All Python dependencies unpinned — Docker builds not reproducible | `requirements.txt`, `Dockerfile` | WEEKS |
| 🟠 HIGH | Code Quality | No frontend test suite of any kind | `booking_system_frontend/src/` | WEEKS |
| 🟠 HIGH | Code Quality | MCP tools have zero test coverage | `server.py:19–97` | WEEKS |
| 🟠 HIGH | Code Quality | `seats_available` race condition — no DB constraint, no row lock | `models.py:20`, `booking.py:19–44` | DAYS |
| 🟠 HIGH | Code Quality | `isErrorResponse` typed as `any` — bypasses TypeScript type safety | `src/services/api.ts:109` | DAYS |
| 🟠 HIGH | Code Quality | No email format validation before API call in `UserIdentification` | `UserIdentification.tsx:22–26` | DAYS |
| 🟠 HIGH | Code Quality | `catch (error: any)` in all async frontend handlers | `Flights.tsx`, `MyBookings.tsx`, `BookingModal.tsx`, `UserIdentification.tsx` | DAYS |

---

## 4. Recommended Remediation Sequence

The following five items represent the minimum work required to make the application safe to expose outside a developer laptop. They are ordered by risk elimination per unit of effort.

**1. Disable or guard `seed.py` for non-development environments**  
`seed.py` runs unconditionally on every startup and deletes all data. This is the single change most likely to cause irreversible data loss in any deployment. An environment flag or record-count guard is a days-level change that eliminates a data-destruction risk entirely. It unblocks all subsequent deployment work.

**2. Add authentication to all REST endpoints and MCP tools**  
The API is fully open. Without at least an API key or bearer token, every other security measure is cosmetic. This is the prerequisite for any production exposure. The service layer and schemas are already clean — auth can be added as FastAPI middleware without restructuring the service code.

**3. Remove user PII from `localStorage`**  
Storing email in `localStorage` is a GDPR-relevant exposure with regulatory consequence. The session identifier stored should be an opaque token, not a serialised user object. This is a frontend-only change requiring no backend modification.

**4. Pin all Python dependencies and add a lockfile**  
All 10 Python packages are unpinned. `pydantic` and `sqlalchemy` have major-version breaking APIs. A new environment or Docker build could resolve to incompatible versions and fail silently. Pinning `requirements.txt` and committing a `pip freeze` output is a low-effort change that makes all builds reproducible and is a prerequisite for trustworthy CI.

**5. Add a CI pipeline with lint, test, and dependency-scan gates**  
All validation is currently manual. A minimal GitHub Actions workflow running `pytest` and `npm run build` on every push would catch regressions automatically. Adding `npm audit` and `pip audit` steps to the same workflow addresses the vulnerability-scanning gap with no additional tooling required.

---

## 5. Positive Findings

The following controls and practices are already well-implemented and should be preserved through any remediation work.

- **Service layer architecture.** Business logic is cleanly isolated in `services/booking.py`, `services/user.py`, and `services/flight.py`. Services return typed `XxxOut | ErrorResponse` — they never raise HTTP exceptions. This separation makes the service layer independently testable and the transport layer thin.

- **Consistent error-response contract.** `ErrorResponse` with `success: bool = False`, `error`, `error_code`, and `details` is used uniformly across all endpoints. The `isErrorResponse()` helper and the Axios response interceptor in `api.ts` provide a consistent detection pattern across the frontend. The `details` field carries agent-readable context, which is well-suited for the MCP interface.

- **Backend test suite quality.** 24 pytest tests cover all 7 error codes at the service layer and the primary happy/error paths at the REST layer. The `conftest.py` fixture strategy — in-memory SQLite, `monkeypatch` on `SessionLocal`, stubbed `seed` — correctly isolates tests with no shared state.

- **Frontend `package-lock.json` committed.** The lockfile (lockfileVersion 3) is tracked in git, making `npm ci` installs fully reproducible for the frontend. This is the only service with reproducible dependency installs.

- **TypeScript strict mode enforced.** `tsconfig.app.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `erasableSyntaxOnly`. The ESLint configuration adds `react-hooks` and `react-refresh` rules. This is a meaningful baseline for type safety.

- **Pydantic v2 patterns used correctly throughout.** All `Out` schemas define `class Config: from_attributes = True`. ORM objects are hydrated via `Model.model_validate(obj)` consistently — the deprecated `.from_orm()` is not used anywhere.
