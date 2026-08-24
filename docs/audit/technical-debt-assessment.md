# Technical Debt Assessment — Galaxium Travels

> Analysis spans `booking_system_backend`, `booking_system_frontend`, and all
> referenced infrastructure files. `booking_system_inventory_hold_service` does
> not exist in the repository. `docker-compose.yml` does not exist in the
> repository. Both absences are recorded as debt items. `AGENTS.md` reviewed
> for operational context.

---

## Table of Contents

1. [Architecture Debt](#1-architecture-debt)
2. [Security Debt](#2-security-debt)
3. [Operational Readiness Debt](#3-operational-readiness-debt)
4. [Code Quality Debt](#4-code-quality-debt)
5. [Summary Table](#5-summary-table)

---

## 1. Architecture Debt

---

**[CRITICAL] [MONTHS]** — Missing inventory hold service

- **Affected:** entire system; `booking_system_inventory_hold_service/` (absent)
- **Description:** The system's booking flow has no seat reservation or hold step between a user selecting a flight and completing a booking. The `booking_system_inventory_hold_service` referenced in project documentation and user queries does not exist. Seat availability is checked and decremented in a single unguarded transaction inside `services/booking.py`. There is no distributed reservation primitive that would allow a multi-step checkout flow, external integrations, or multi-instance deployment.
- **Consequence:** The entire service topology described by the project name is missing. Any future requirement for a quote-before-book flow, multi-step checkout, or integration with an external inventory system has no foundation.

---

**[HIGH] [WEEKS]** — REST routes and MCP tools co-located in a single 191-line file

- **Affected:** `booking_system_backend/server.py`
- **Description:** `server.py` contains FastAPI route handlers, FastMCP tool definitions, CORS middleware, lifespan management, and application entry point in a single file. As the API surface grows, this file becomes a merge conflict hotspot and violates the single-responsibility principle. REST and MCP transports share no abstraction layer — each tool/route is a separate reimplementation of the same delegation pattern.
- **Consequence:** Adding a new endpoint requires editing one file that owns the entire server surface. Parallel development by multiple contributors will produce frequent merge conflicts. The MCP and REST halves will inevitably diverge over time.

---

**[HIGH] [WEEKS]** — No separation between runtime and test dependencies

- **Affected:** `booking_system_backend/requirements.txt`, `booking_system_backend/Dockerfile`
- **Description:** `pytest`, `pytest-asyncio`, `pytest-cov`, and `httpx` are listed in the same `requirements.txt` as `fastapi`, `uvicorn`, and `sqlalchemy`. The Dockerfile (`COPY . . && pip install -r requirements.txt`) installs all test tooling into the production image with no separation.
- **Consequence:** Production containers carry unnecessary packages, increasing image size and attack surface. Any CVE in a test dependency affects the production environment.

---

**[HIGH] [WEEKS]** — SQLite used as the sole database with no migration strategy

- **Affected:** `booking_system_backend/db.py`, `booking_system_backend/models.py`
- **Description:** The application uses a single SQLite file (`booking.db`) with `Base.metadata.create_all()` called on startup. There is no schema migration tool (Alembic, Flyway). Any column addition, removal, or constraint change requires dropping and recreating the database. SQLite also has no concurrent-write capability — a second Uvicorn worker would fail to acquire the write lock.
- **Consequence:** Schema changes in production require data loss or a manual migration script. The application cannot scale beyond a single process. A move to Postgres or MySQL requires rewriting all column type annotations.

---

**[MEDIUM] [WEEKS]** — Frontend performs a full flight catalog fetch to resolve a client-side join

- **Affected:** `booking_system_frontend/src/pages/MyBookings.tsx:35–38`
- **Description:** The My Bookings page calls `getFlights()` (all flights) in parallel with `getUserBookings()` to join flight details onto each booking client-side via `getFlightForBooking()`. There is no `GET /bookings/{id}/flight` or `GET /booking/{id}` endpoint that returns enriched booking data. As the flight catalog grows, this pattern transfers all flight data to every user loading their bookings page.
- **Consequence:** Unnecessary data transfer on every bookings page load. Any future pagination of the flight catalog breaks the join silently — flights not in the current page will render as "Flight ID: {id}" with no details.

---

**[MEDIUM] [DAYS]** — No `/booking/{id}` endpoint — single booking lookup is impossible

- **Affected:** `booking_system_backend/server.py`, `booking_system_backend/services/booking.py`
- **Description:** The API exposes `GET /bookings/{user_id}` (all bookings for a user) but has no endpoint to fetch a single booking by `booking_id`. There is no corresponding service function either. Any external system, MCP tool, or future UI feature that needs to inspect one booking must fetch the entire user's booking history and filter client-side.
- **Consequence:** Blocks implementation of booking detail pages, confirmation emails, and webhook callbacks. Forces over-fetching in any future integration.

---

**[LOW] [DAYS]** — `price` field has no defined unit, currency, or scale

- **Affected:** `booking_system_backend/models.py:19`, `booking_system_frontend/src/utils/formatters.ts:40`
- **Description:** `Flight.price` is `Column(Integer)` with no metadata. The frontend formatter hardcodes `currency: 'USD'` and renders raw integer values as dollar amounts. There is no agreed contract between backend and frontend on whether the unit is cents, whole dollars, or fictional credits.
- **Consequence:** Any future currency change, internationalisation, or payment integration has no canonical definition to build from. The `$1,000,000` display for an Earth-Mars flight is ambiguous and potentially misleading.

---

## 2. Security Debt

---

**[CRITICAL] [WEEKS]** — No authentication or authorisation on any endpoint or MCP tool

- **Affected:** `booking_system_backend/server.py` (all routes and tools)
- **Description:** Every REST endpoint and every MCP tool is publicly accessible with no token, session, API key, or middleware. Any caller who knows a `user_id` can book or cancel on behalf of any user. The `name` parameter on `POST /book` provides a weak integrity hint, not a security control. CORS is set to `allow_origins=["*"]`.
- **Consequence:** The API is fully open to abuse from any network-reachable client. In production, any user could cancel any other user's booking by guessing or enumerating `booking_id` integers.

---

**[CRITICAL] [DAYS]** — Full user PII stored in `localStorage` in plaintext

- **Affected:** `booking_system_frontend/src/hooks/useUser.tsx:26`
- **Description:** The complete `User` object — `user_id`, `name`, and `email` — is serialised to `localStorage` via `JSON.stringify` and persists across sessions under the key `galaxium_user`. Any same-origin JavaScript (XSS vector, browser extension, or injected third-party script) can read this value directly.
- **Consequence:** A single XSS injection anywhere on the frontend exposes every stored user's email address. Email addresses are PII under GDPR and equivalent regulations — a breach has regulatory consequences.

---

**[HIGH] [WEEKS]** — No input length or content constraints on string fields

- **Affected:** `booking_system_backend/schemas.py`, `booking_system_backend/services/user.py`, `booking_system_backend/services/booking.py`
- **Description:** `name`, `origin`, and `destination` are declared as `str` in Pydantic schemas with no `min_length`, `max_length`, or `Field` constraints. An empty string, a string of 10 MB, or a SQL injection attempt passes schema validation and reaches the ORM layer. Only `email` is validated via `EmailStr`.
- **Consequence:** Potential for oversized payloads causing memory pressure, and for injection of control characters into string columns that could affect downstream consumers of the data.

---

**[HIGH] [DAYS]** — `VITE_API_URL` hardcoded fallback points to wrong port

- **Affected:** `booking_system_frontend/src/services/api.ts:13`
- **Description:** The Axios instance falls back to `http://localhost:8080` when `VITE_API_URL` is not set. The backend actually binds to `8081`. Any deployment that omits the `.env` file silently points at a non-existent server, producing network errors that surface only at runtime.
- **Consequence:** A deployment without a `.env` file silently misconfigures the API base URL. Errors appear as generic network failures, not configuration failures — difficult to diagnose without source inspection.

---

**[MEDIUM] [DAYS]** — `seed.py` deletes all data on every server startup unconditionally

- **Affected:** `booking_system_backend/seed.py:9–13`
- **Description:** `seed()` runs unconditionally on every startup via the FastAPI lifespan hook. It deletes all rows from `bookings`, `users`, and `flights` before inserting demo data. There is no environment flag, record-count guard, or idempotency check.
- **Consequence:** Any production server restart destroys all user accounts and booking history. A container restart triggered by a health check failure would silently wipe the database.

---

**[MEDIUM] [DAYS]** — No HTTPS or TLS configuration anywhere in the stack

- **Affected:** `booking_system_backend/server.py:188–190`, `booking_system_backend/Dockerfile`
- **Description:** Uvicorn is started with no `ssl_keyfile` or `ssl_certfile`. The Dockerfile exposes port 8080 with no TLS termination. There is no reverse proxy (nginx, Traefik) configuration in the repository. User email addresses and booking data are transmitted in plaintext.
- **Consequence:** All traffic between frontend and backend is unencrypted. Email addresses, user identities, and booking details are visible to any network observer.

---

## 3. Operational Readiness Debt

---

**[CRITICAL] [WEEKS]** — No CI/CD pipeline

- **Affected:** repository root (`.github/workflows/` absent)
- **Description:** No GitHub Actions, GitLab CI, or any other CI configuration exists. There are no automated test runs, build checks, lint gates, security scans, or deployment pipelines. All validation is manual.
- **Consequence:** Any commit to the main branch can break tests, introduce lint errors, or contain vulnerable dependencies without automated detection. There is no deployment mechanism other than manually running start scripts.

---

**[CRITICAL] [WEEKS]** — No container orchestration or multi-service deployment definition

- **Affected:** repository root (`docker-compose.yml` absent); `booking_system_frontend/` (Dockerfile absent)
- **Description:** `docker-compose.yml` does not exist. Only the backend has a Dockerfile (with a port mismatch bug: `EXPOSE 8080` vs actual bind port `8081`). The frontend has no Dockerfile. There is no way to build and run the full stack in containers without manual steps.
- **Consequence:** There is no reproducible, scripted path from source to a running containerised environment. The absence of `docker-compose.yml` means each developer must manually coordinate two process starts. The frontend cannot be containerised at all without first writing a Dockerfile.

---

**[HIGH] [WEEKS]** — No structured logging anywhere in the backend

- **Affected:** `booking_system_backend/server.py`, all `services/` files, `db.py`
- **Description:** No `import logging` or structured log output exists in any backend module. The only process output is `print("Database seeded...")` in `seed.py`. Successful bookings, cancellations, errors, and database failures produce no log output. There is no correlation ID, request ID, or trace header propagated.
- **Consequence:** Production incidents cannot be diagnosed from logs. There is no audit trail of bookings or cancellations. Any post-incident forensics requires direct database inspection.

---

**[HIGH] [DAYS]** — Backend Dockerfile `EXPOSE` port does not match actual bind port

- **Affected:** `booking_system_backend/Dockerfile:5`, `booking_system_backend/server.py:190`
- **Description:** The Dockerfile declares `EXPOSE 8080` but `server.py` calls `uvicorn.run(app, host="0.0.0.0", port=8081)`. A `docker run -p 8080:8080` invocation will map to a port the server is not listening on, producing a silent connection failure.
- **Consequence:** Any deployment using the standard `EXPOSE` port will fail silently. Docker documentation, monitoring, and service discovery based on the exposed port will be wrong.

---

**[HIGH] [WEEKS]** — No health check endpoint beyond a trivial `{"status": "OK"}`

- **Affected:** `booking_system_backend/server.py:133–136`
- **Description:** `GET /` returns `{"status": "OK"}` unconditionally. It does not check database connectivity, ORM session health, or service dependencies. A container orchestrator configured to use this endpoint as a liveness probe will report healthy even when the database is unreachable.
- **Consequence:** A container with a broken database connection will appear healthy to Kubernetes, ECS, or any other orchestrator. Traffic will be routed to broken instances.

---

**[HIGH] [WEEKS]** — No Python dependency lockfile — Docker builds are not reproducible

- **Affected:** `booking_system_backend/requirements.txt`, `booking_system_backend/Dockerfile`
- **Description:** `requirements.txt` has no pinned versions. The Dockerfile runs `pip install --no-cache-dir -r requirements.txt` at build time, resolving to whatever the PyPI resolver returns at that moment. Two image builds from the same commit on different days may produce different installed packages.
- **Consequence:** A production image built today and the same image rebuilt next month after a dependency release will have different transitive dependency trees. A silent breaking change in any unpinned dependency will appear as a build-time or runtime regression with no clear cause.

---

**[MEDIUM] [DAYS]** — No environment variable validation on startup

- **Affected:** `booking_system_backend/server.py`, `booking_system_backend/db.py`
- **Description:** `db.py` hardcodes `SQLALCHEMY_DATABASE_URL = 'sqlite:///./booking.db'` — no environment variable override is read. `python-dotenv` is installed but there is no `load_dotenv()` call anywhere in the backend. `VITE_API_URL` on the frontend has a wrong fallback. Neither service validates required configuration at startup.
- **Consequence:** Misconfigured deployments (wrong DB URL, missing API URL) fail silently at runtime rather than immediately at startup with a clear diagnostic message.

---

**[MEDIUM] [WEEKS]** — No vulnerability scanning in the dependency pipeline

- **Affected:** `requirements.txt`, `package.json`
- **Description:** No `pip audit`, `safety`, `trivy`, Dependabot, Renovate, or `npm audit` step is configured anywhere. Known CVEs in production dependencies would not be detected before deployment.
- **Consequence:** A known exploitable vulnerability in any dependency could persist undetected indefinitely. The first notification would come from a security incident, not a scanner.

---

**[LOW] [DAYS]** — `start.bat`/`start.sh` use `npm install` instead of `npm ci`

- **Affected:** `start.bat:68`, `start.sh`
- **Description:** The one-command launchers run `npm install`, which resolves within caret ranges and may produce a different `node_modules` than the committed `package-lock.json`. `npm ci` would enforce the lockfile exactly.
- **Consequence:** Developer environments may silently diverge from the locked dependency set. Bugs caused by minor-version package upgrades are difficult to reproduce across machines.

---

## 4. Code Quality Debt

---

**[HIGH] [WEEKS]** — No frontend test suite

- **Affected:** `booking_system_frontend/src/` (entire directory)
- **Description:** There are no unit, component, integration, or end-to-end tests. No test framework is configured. The only validation gate is `tsc -b && vite build`. Critical paths — `isErrorResponse`, booking state machine, cancel confirmation flow, `useUser` persistence — have never been exercised by automated tests.
- **Consequence:** Any refactor, dependency upgrade, or bug fix in the frontend has no automated regression detection. Production regressions are caught only by manual testing or user reports.

---

**[HIGH] [WEEKS]** — MCP tools have zero test coverage

- **Affected:** `booking_system_backend/server.py:19–97`
- **Description:** All six `@mcp.tool()` functions are untested. The MCP-specific wiring — manual `SessionLocal()` lifecycle, `isinstance(result, ErrorResponse)` check, and `raise Exception(...)` error escalation — is distinct from the REST path and exercises different code. No test verifies that MCP tools correctly propagate errors or manage sessions.
- **Consequence:** A regression in any MCP tool — including a session leak or an uncaught exception — would not be detected by the test suite.

---

**[HIGH] [DAYS]** — `seats_available` has no DB-level constraint and is vulnerable to a race condition

- **Affected:** `booking_system_backend/models.py:20`, `booking_system_backend/services/booking.py:19–44`
- **Description:** `seats_available` is `Column(Integer, nullable=False)` with no `CheckConstraint(seats_available >= 0)`. The service reads the value, checks `< 1`, and decrements in a separate ORM write with no row lock. Concurrent requests can pass the guard simultaneously and drive the count negative.
- **Consequence:** In any multi-request scenario (even with a single worker handling async requests), seat counts can go negative. A flight could be double-booked. The inconsistency is persisted to the database.

---

**[MEDIUM] [DAYS]** — `booking_time` timestamp format is inconsistent between `seed.py` and `services/booking.py`

- **Affected:** `booking_system_backend/seed.py:54`, `booking_system_backend/services/booking.py:49`
- **Description:** `booking.py` stores `datetime.utcnow().isoformat()` (no timezone suffix). `seed.py` appends `"Z"` to the same call. Values in the same `booking_time` column have two different string formats. The frontend `parseISO` handles both today, but any strict ISO 8601 parser or database query using string comparison will behave differently on the two formats.
- **Consequence:** String-based date comparison queries on `booking_time` will produce incorrect ordering. Any migration to a typed datetime column must handle two input formats.

---

**[MEDIUM] [DAYS]** — `useUser` hook double-writes to `localStorage` on every state update

- **Affected:** `booking_system_frontend/src/hooks/useUser.tsx:25–40`
- **Description:** `setUser()` explicitly writes to `localStorage` at line 26, and a `useEffect` dependent on `[user]` writes to `localStorage` again at line 39 on every state change. Every user context update triggers two synchronous `localStorage.setItem` calls with identical data. The effect also fires on initial render when a user is loaded from storage, producing a redundant write.
- **Consequence:** Unnecessary synchronous storage writes on every user context change. On low-end devices, synchronous `localStorage` writes block the main thread.

---

**[MEDIUM] [DAYS]** — `isErrorResponse` typed as `any` defeats TypeScript type safety at all call sites

- **Affected:** `booking_system_frontend/src/services/api.ts:109`
- **Description:** The `isErrorResponse` type guard is declared as `(response: any): response is ErrorResponse`. Every call site passes an untyped value. TypeScript cannot catch callers passing the wrong argument type. The guard checks only `response.success === false`, which matches any object with that property — including accidental false positives.
- **Consequence:** Type safety at the API boundary — the most critical point for error discrimination — is entirely opt-in. A caller passing the wrong value will receive a boolean result with no compile-time warning.

---

**[MEDIUM] [WEEKS]** — `catch (error: any)` used universally across all async frontend handlers

- **Affected:** `src/pages/Flights.tsx:50`, `src/pages/MyBookings.tsx:41`, `src/components/bookings/BookingModal.tsx:46`, `src/components/user/UserIdentification.tsx:60`
- **Description:** Every async error handler types the caught value as `any` and assumes the shape `error.details || error.error`. This pattern silently swallows non-`ErrorResponse` errors (network failures, JSON parse errors, unexpected exceptions), displaying a misleading fallback message to the user with no structural guarantee.
- **Consequence:** Runtime errors that are not `ErrorResponse`-shaped (e.g. a 502 from a reverse proxy, a JSON parse failure on a malformed response) are silently swallowed and displayed as generic messages. Debugging requires source inspection.

---

**[MEDIUM] [DAYS]** — `datetime.utcnow()` is deprecated as of Python 3.12

- **Affected:** `booking_system_backend/services/booking.py:49`, `booking_system_backend/seed.py:49`
- **Description:** Both files call `datetime.utcnow()`, which was deprecated in Python 3.12 in favour of `datetime.now(timezone.utc)`. The Dockerfile pins Python 3.11, so no warnings are emitted today. An image upgrade to 3.12+ would introduce `DeprecationWarning` on every booking creation and every seed run.
- **Consequence:** A Python runtime upgrade without addressing this will produce deprecation warnings in every production log line that creates a booking. In Python 3.14, `utcnow()` is scheduled for removal.

---

**[LOW] [DAYS]** — No JSDoc or docstrings on frontend exported functions and components

- **Affected:** `booking_system_frontend/src/components/`, `booking_system_frontend/src/pages/`, `booking_system_frontend/src/hooks/`
- **Description:** The project rule in `.bob/rules/basic-rules.md` requires "concise JSDoc strings for every public function." Component files (`UserIdentification`, `BookingModal`, `FlightCard`, `BookingCard`) and hooks (`useUser`) export public functions with no JSDoc. Only `formatters.ts` and `api.ts` have doc comments.
- **Consequence:** IDE hover documentation and generated API docs are incomplete. The stated project standard is not enforced.

---

**[LOW] [DAYS]** — `FlightCard` computes `isSoldOut` from stale local state

- **Affected:** `booking_system_frontend/src/components/flights/FlightCard.tsx:14`, `booking_system_frontend/src/pages/Flights.tsx:75–78`
- **Description:** `isSoldOut = flight.seats_available === 0` is computed from the locally-held flight list, which is only refreshed after a successful booking by the current user. If another user books the last seat concurrently, the card continues to display available seats until the current user either books (fails) or manually refreshes.
- **Consequence:** Users may attempt to book sold-out flights, incurring a round-trip API call that returns `NO_SEATS_AVAILABLE`. The UX presents an availability that the backend no longer honours.

---

**[LOW] [DAYS]** — Three REST error-code paths not covered by the test suite

- **Affected:** `booking_system_backend/tests/test_rest.py`
- **Description:** `NO_SEATS_AVAILABLE`, `NAME_MISMATCH`, and `ALREADY_CANCELLED` are tested at the service layer but have no corresponding REST-layer test. A regression in the route handler for these paths — such as a wrong `response_model` or a missing delegation call — would not be detected.
- **Consequence:** Silent REST-layer regressions on three error paths would pass the full test suite.

---

## 5. Summary Table

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Architecture Debt | 1 | 2 | 2 | 1 | **6** |
| Security Debt | 2 | 2 | 2 | 0 | **6** |
| Operational Readiness Debt | 2 | 4 | 2 | 1 | **9** |
| Code Quality Debt | 0 | 3 | 5 | 3 | **11** |
| **Total** | **5** | **11** | **11** | **5** | **32** |
