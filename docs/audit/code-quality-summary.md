# Code Quality Audit — Galaxium Travels

> Findings are based on direct source file analysis. No fixes are suggested.
> The Java hold service (`booking_system_inventory_hold_service`) does not exist in the repository and is omitted.

---

## 1. Overview Table

| Component | Language | Files Analysed | Critical | High | Medium | Low |
|---|---|---|---|---|---|---|
| `booking_system_backend` | Python 3.11 | `server.py`, `models.py`, `services/booking.py`, `services/user.py`, `services/flight.py`, `db.py`, `seed.py`, `schemas.py`, `tests/conftest.py`, `tests/test_rest.py`, `tests/test_services.py` | 2 | 4 | 6 | 4 |
| `booking_system_frontend` | TypeScript 5.9 | `src/services/api.ts`, `src/hooks/useUser.tsx`, `src/pages/Flights.tsx`, `src/pages/MyBookings.tsx`, `src/components/user/UserIdentification.tsx`, `src/components/bookings/BookingModal.tsx`, `src/components/bookings/BookingCard.tsx`, `src/components/flights/FlightCard.tsx`, `src/utils/formatters.ts`, `src/types/index.ts` | 1 | 3 | 4 | 3 |
| `booking_system_inventory_hold_service` | Java | — | — | — | — | — |
| **Total** | | **21** | **3** | **7** | **10** | **7** |

---

## 2. `booking_system_backend` Findings

### 🔴 CRITICAL — No authentication or authorisation on any endpoint

**File:** `server.py` — all route handlers (lines 139–178)

The entire API is publicly accessible. Any caller who knows a `user_id` can book or cancel on behalf of any user. There are no tokens, sessions, API keys, or middleware. The `name` parameter in `POST /book` is a weak integrity check, not a security control — it is trivially bypassable by anyone who knows the target user's name.

**Evidence:** `server.py:146` — `book_flight_endpoint(request: BookingRequest, db: Session = Depends(get_db))` — no auth dependency injected.

---

### 🔴 CRITICAL — No authentication or authorisation on MCP tools

**File:** `server.py` — MCP tool definitions (lines 19–97)

MCP tools are mounted at `/mcp` with no authentication layer. Any process that can reach port 8081 can call `book_flight`, `cancel_booking`, or `register_user` without credentials. The `@mcp.tool()` decorator provides no access control.

**Evidence:** `server.py:19` — `@mcp.tool()` with no auth parameter or middleware configured on `mcp_app`.

---

### 🔴 HIGH — `seats_available` has no DB-level constraint and is not protected against concurrent writes

**File:** `models.py:20`, `services/booking.py:19–44`

`seats_available` is `Column(Integer, nullable=False)` with no `CheckConstraint` preventing it going below zero. The service checks `seats_available < 1` and then decrements in a separate step with no row-level lock. Two concurrent requests can pass the check simultaneously, both decrement, and drive the count negative.

**Evidence:** `models.py:20` — no `CheckConstraint`; `booking.py:19` — `if flight.seats_available < 1` followed by `flight.seats_available -= 1` at line 44 with no `SELECT FOR UPDATE` or equivalent.

---

### 🔴 HIGH — `seed.py` deletes all production data on every startup

**File:** `seed.py:9–13`

The seed function unconditionally runs `DELETE` on all three tables on every server startup, then re-inserts demo data. There is no guard for a production environment. Any restart of the process wipes the database.

**Evidence:** `seed.py:9–11` — `db.query(Booking).delete()`, `db.query(User).delete()`, `db.query(Flight).delete()` with `db.commit()` before any insert.

---

### 🟠 HIGH — No input validation on string fields at the REST or service layer

**File:** `server.py:169–172`, `services/user.py:6–20`, `services/booking.py:7–54`

`name`, `email`, `origin`, and `destination` fields are passed directly to the ORM without length limits, whitespace normalisation, or character validation beyond Pydantic's `EmailStr` for email. An empty string `" "` passes `EmailStr` validation and is written to the database. `name` has no minimum length.

**Evidence:** `schemas.py:36–38` — `UserRegistration` has `name: str` with no `min_length` or `Field` constraint; `services/user.py:16` — `User(name=name, email=email)` with raw unsanitised input.

---

### 🟠 HIGH — No logging in any backend module

**Files:** `server.py`, `services/booking.py`, `services/user.py`, `services/flight.py`, `db.py`

No `import logging` appears anywhere. Errors, successful bookings, cancellations, and DB exceptions are all silent. The only output is `print("Database seeded...")` in `seed.py:59`. There is no way to audit past operations or diagnose production issues from logs.

**Evidence:** None of the five core backend files contain a `logging` import or any `logger.*` call.

---

### 🟡 MEDIUM — `booking_time` timestamp is inconsistently formatted

**Files:** `services/booking.py:49`, `seed.py:54`

`booking.py` sets `booking_time = datetime.utcnow().isoformat()` (no `"Z"` suffix, no timezone). `seed.py` appends `+ "Z"` to the same call. Values in the same column have two different formats. `formatters.ts` uses `parseISO` which handles both, but any strict ISO 8601 consumer will reject the no-suffix form.

**Evidence:** `booking.py:49` — `.isoformat()` with no suffix; `seed.py:54` — `.isoformat() + "Z"`.

---

### 🟡 MEDIUM — `seed.py` inserts 20 bookings without decrementing `seats_available`

**File:** `seed.py:48–56`

Demo bookings are inserted with random statuses (including `"booked"`) but `seats_available` on the corresponding flights is never decremented. This means the displayed seat count is inconsistent with the booking records from the moment the server starts.

**Evidence:** `seed.py:50–55` — `Booking(...)` inserted in a loop with no `flight.seats_available -= 1`.

---

### 🟡 MEDIUM — `db.py` session is not closed in `seed.py` on exception paths

**File:** `seed.py:6–59`

`seed()` opens `db = SessionLocal()` and calls `db.close()` at the end, but has no `try/finally`. If any DB operation raises an exception, the session is leaked and the connection is never returned to the pool.

**Evidence:** `seed.py:8` — `db = SessionLocal()` with no `try/finally` wrapping lines 9–58.

---

### 🟡 MEDIUM — `ErrorResponse` returned with HTTP 200 is undetectable to generic HTTP clients

**File:** `server.py:145–178`, `schemas.py:49–53`

All error conditions (booking failures, user not found, etc.) return HTTP 200 with a JSON body where `success: false`. Any HTTP client that does not explicitly inspect `response.success` — including standard monitoring tools, API gateways, and non-Galaxium MCP callers — will treat all responses as successful.

**Evidence:** `server.py:145` — `response_model=Union[BookingOut, ErrorResponse]`; no status code override on error path.

---

### 🟡 MEDIUM — `requirements.txt` has no pinned versions

**File:** `requirements.txt`

All 10 dependencies are unpinned (e.g. `fastapi`, `sqlalchemy`, `pydantic[email]`). A `pip install` at any point in time may pull a breaking version. There is no `pip freeze` lockfile or hash-verified install.

**Evidence:** `requirements.txt:1–10` — no `==` version specifiers on any line.

---

### 🔵 LOW — `datetime.utcnow()` is deprecated in Python 3.12+

**Files:** `services/booking.py:49`, `seed.py:49`

`datetime.utcnow()` was deprecated in Python 3.12 in favour of `datetime.now(timezone.utc)`. The current runtime image uses Python 3.11 (`Dockerfile:1`) so this does not error today, but will emit deprecation warnings when the image is upgraded.

**Evidence:** `booking.py:49` — `datetime.utcnow().isoformat()`; `seed.py:49` — `datetime.utcnow()`.

---

### 🔵 LOW — `price` has no unit or currency definition anywhere

**Files:** `models.py:19`, `schemas.py:8`

`price` is `Column(Integer)`. There is no comment, docstring, or field metadata indicating whether the unit is USD cents, USD dollars, or fictional credits. `formatters.ts:40` assumes USD dollars (`currency: 'USD'`), but a price of `1000000` for an Earth–Mars flight formats as `$1,000,000` — ambiguous.

**Evidence:** `models.py:19` — `price = Column(Integer, nullable=False)` with no metadata; `formatters.ts:40` — `currency: 'USD'` hardcoded.

---

### 🔵 LOW — REST test suite does not cover three documented error codes

**File:** `tests/test_rest.py`

`NO_SEATS_AVAILABLE`, `NAME_MISMATCH`, and `ALREADY_CANCELLED` are all defined error codes and are covered at the service layer, but no REST-layer test exercises them via HTTP. A regression in the route handler for these paths would go undetected.

**Evidence:** `test_rest.py` — no test class or method names reference these three error codes.

---

### 🔵 LOW — MCP tools have zero test coverage

**File:** `server.py:19–97`

All six `@mcp.tool()` functions are untested. The service layer they call is tested, but the MCP-specific wiring — session management, `isinstance(result, ErrorResponse)` check, and `raise Exception(...)` path — is never exercised.

**Evidence:** `tests/` directory — no `test_mcp.py` or any file importing `mcp` or calling an MCP tool.

---

## 3. `booking_system_frontend` Findings

### 🔴 CRITICAL — Full user object (including email) stored in `localStorage` in plaintext

**File:** `src/hooks/useUser.tsx:26`

The complete `User` object — including `user_id`, `name`, and `email` — is serialised to `localStorage` with `JSON.stringify` and persists across sessions. Any JavaScript running on the same origin (XSS vector, browser extension, third-party script) can read `localStorage.getItem('galaxium_user')` and extract the user's email address.

**Evidence:** `useUser.tsx:26` — `localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))`.

---

### 🟠 HIGH — `isErrorResponse` parameter typed as `any`

**File:** `src/services/api.ts:109–113`

The `isErrorResponse` type guard accepts `response: any`, bypassing all TypeScript type checking at the call site. A caller can pass any value — including `undefined`, a number, or a completely unrelated object — without a compile-time error. The guard also only checks `response.success === false`, which would return `true` for any object with that property set.

**Evidence:** `api.ts:109` — `export const isErrorResponse = (response: any): response is ErrorResponse`.

---

### 🟠 HIGH — No email format validation before API call in `UserIdentification`

**File:** `src/components/user/UserIdentification.tsx:22–26`

The submit handler checks only `!name.trim() || !email.trim()` before calling the API. There is no regex or `type="email"` constraint enforcement in the handler itself. The `<Input type="email" />` attribute at line 99 provides browser-level hint only — it is bypassed by programmatic form submission and does not prevent malformed email strings from reaching the backend.

**Evidence:** `UserIdentification.tsx:23` — `if (!name.trim() || !email.trim())` is the only validation guard before `registerUser(...)` at line 33.

---

### 🟠 HIGH — `catch (error: any)` used in all async handlers

**Files:** `src/pages/Flights.tsx:50`, `src/pages/MyBookings.tsx:41`, `src/components/bookings/BookingModal.tsx:46`, `src/components/user/UserIdentification.tsx:60`

Every `catch` block types the caught value as `any`, defeating TypeScript's type system for error handling. The pattern `error.details || error.error || 'fallback'` assumes `error` is always an `ErrorResponse` shape, but network errors, JSON parse failures, and unexpected exceptions will silently fall through to the fallback string with no structural guarantees.

**Evidence:** `Flights.tsx:50` — `catch (error: any)`; `MyBookings.tsx:41` — `catch (error: any)`; `BookingModal.tsx:46` — `catch (error: any)`; `UserIdentification.tsx:60` — `catch (error: any)`.

---

### 🟡 MEDIUM — No frontend test suite of any kind

**Files:** entire `src/` directory

No unit, integration, or component tests exist. No test framework is configured. The only validation is `tsc -b && vite build`. Critical paths — `isErrorResponse`, booking flow state machine, cancel confirmation, `useUser` persistence — are completely untested.

**Evidence:** `package.json` — no `test` script; no `jest.config.*`, `vitest.config.*`, or `playwright.config.*` found anywhere in `booking_system_frontend/`.

---

### 🟡 MEDIUM — `useUser` has a redundant `useEffect` that double-writes to `localStorage`

**File:** `src/hooks/useUser.tsx:36–41`

`setUser` at line 23–30 already writes to `localStorage` on every call. The `useEffect` at line 36 also writes to `localStorage` whenever `user` changes. Every `setUser(x)` call triggers both writes — the effect is that `localStorage` is written twice per state update with identical data, and the effect also runs on the initial render if a user was loaded from storage.

**Evidence:** `useUser.tsx:25–26` — write in `setUser`; `useUser.tsx:38–40` — write in `useEffect([user])`.

---

### 🟡 MEDIUM — `formatCurrency` assumes USD with no currency field on `Flight`

**File:** `src/utils/formatters.ts:39–46`, `src/types/index.ts:9`

`formatCurrency` hardcodes `currency: 'USD'` and renders `price` as dollars. The `Flight.price` field is typed as `number` with no currency metadata. A `price` of `1000000` renders as `$1,000,000`, which may be misleading in a fictional interplanetary context and will be wrong if the unit is cents.

**Evidence:** `formatters.ts:41` — `currency: 'USD'`; `types/index.ts:9` — `price: number` with no annotation.

---

### 🟡 MEDIUM — `MyBookings` fetches all flights to perform a client-side join

**File:** `src/pages/MyBookings.tsx:35–38`

On every load of the My Bookings page, the frontend calls both `getUserBookings(user.user_id)` and `getFlights()` in parallel, then joins them client-side via `getFlightForBooking`. As the flight catalog grows, this transfers all flight data to the client on every bookings page view, regardless of how many flights are relevant to the user's bookings.

**Evidence:** `MyBookings.tsx:35–38` — `Promise.all([getUserBookings(user.user_id), getFlights()])`.

---

### 🔵 LOW — `FlightCard` renders `seats_available` from stale client-side state

**File:** `src/components/flights/FlightCard.tsx:13–14`, `src/pages/Flights.tsx:75–78`

`isSoldOut` is computed from `flight.seats_available === 0` on the locally-held flight list. The list is only refreshed after a successful booking by the same user (`handleBookingSuccess` → `loadFlights`). If another user books the last seat between page load and the current user's booking attempt, the card still shows seats available until the booking fails and the user manually refreshes.

**Evidence:** `FlightCard.tsx:13–14` — `const isSoldOut = flight.seats_available === 0`; `Flights.tsx:75–78` — `loadFlights()` only called on success.

---

### 🔵 LOW — `console.error` used for observability in `formatters.ts`

**File:** `src/utils/formatters.ts:16`

`formatDate` calls `console.error('Error formatting date:', error)` on parse failure. In a production build, this writes to the browser console only and is not captured by any error monitoring or logging system. There is no structured error reporting.

**Evidence:** `formatters.ts:16` — `console.error('Error formatting date:', error)`.

---

### 🔵 LOW — No zero-seat guard in `BookingModal` before submitting

**File:** `src/components/bookings/BookingModal.tsx:23–51`

`handleConfirmBooking` does not check `flight.seats_available > 0` before calling `bookFlight`. If the modal is opened on a flight with `seats_available === 0` (possible if the parent component's state is stale), the API call will be made and fail with `NO_SEATS_AVAILABLE`. The UI-level guard in `FlightCard` (`disabled={isSoldOut}`) can be bypassed if the card's state is stale.

**Evidence:** `BookingModal.tsx:23` — `handleConfirmBooking` checks only `if (!user)` before proceeding to `bookFlight`.

---

## 4. `booking_system_inventory_hold_service` Findings

**This service does not exist in the repository.** No files were found at or under `booking_system_inventory_hold_service/`. No findings are possible.
