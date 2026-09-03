# Plan: Fix README API Endpoint Documentation (Issue #1)

## Overview

The `booking_system_backend/README.md` documents REST endpoints with an `/api/*` prefix
(e.g. `/api/flights`) and port `8080`, but the actual `server.py` routes have **no prefix**
(e.g. `/flights`) and run on **port `8081`**. The code, frontend, and tests are all consistent
with the no-prefix / port-8081 reality. The README is the sole source of the discrepancy.

**Approach:** Correct the README to match the actual server — no code changes required.

---

## Sub-Tasks

### Sub-Task 1 — Fix REST endpoint paths in the API Reference table

**Intent**
Remove the `/api/` prefix from all six endpoint paths in the REST Endpoints table so the
documentation matches `server.py`.

**Expected Outcomes**
- Table rows show `/flights`, `/book`, `/bookings/{user_id}`, `/cancel/{booking_id}`,
  `/register`, `/user?name=...&email=...`.

**Todo List**
1. In `booking_system_backend/README.md` lines 38–43, strip `/api` from each path.

**Relevant Context**
- `booking_system_backend/README.md` lines 36–43 (REST Endpoints table)
- `booking_system_backend/server.py` route decorators (confirmed paths: no prefix)

**Status:** [x] done

---

### Sub-Task 2 — Fix port and prefix in the "Quick Start" section

**Intent**
The "Run the Server" blurb (line 27–29) states port `8080` and `REST endpoints at /api/*`.
Both are wrong — the server runs on `8081` and routes have no prefix.

**Expected Outcomes**
- Line 27 reads: `The server starts on port **8081** with:`
- Line 28 reads: `- REST endpoints at /*` (or equivalent accurate wording)

**Todo List**
1. Change `8080` → `8081` on line 27.
2. Change `REST endpoints at /api/*` → `REST endpoints at /*` on line 28.

**Relevant Context**
- `booking_system_backend/README.md` lines 27–29
- `server.py` line 190: `uvicorn.run(app, host="0.0.0.0", port=8081)`

**Status:** [x] done

---

### Sub-Task 3 — Fix curl examples in the Usage Examples section

**Intent**
All six `curl` examples use `localhost:8080/api/*`. Both the port and the path prefix are
wrong; they must reflect the actual server address and routes.

**Expected Outcomes**
- All curl commands use `http://localhost:8081` (no `/api` segment).
- Example: `curl http://localhost:8081/flights`

**Todo List**
1. In lines 62–79, replace every occurrence of `localhost:8080/api/` with `localhost:8081/`.

**Relevant Context**
- `booking_system_backend/README.md` lines 60–79 (REST API usage examples)

**Status:** [x] done

---

### Sub-Task 4 — Fix MCP connect URL and Docker port in remaining sections

**Intent**
Line 83 documents the MCP connect URL as `http://localhost:8080/mcp` (wrong port).
Line 142 documents Docker as `-p 8080:8080` (wrong port).

**Expected Outcomes**
- Line 83 reads: `Connect to http://localhost:8081/mcp …`
- Line 142 reads: `docker run -p 8081:8081 galaxium-booking`

**Todo List**
1. Change `localhost:8080/mcp` → `localhost:8081/mcp` on line 83.
2. Change `-p 8080:8080` → `-p 8081:8081` on line 142.

**Relevant Context**
- `booking_system_backend/README.md` lines 83, 142
- MCP mount confirmed at `/mcp` in `server.py` line 183

**Status:** [x] done

---

## Files Changed

| File | Change |
|------|--------|
| `booking_system_backend/README.md` | Remove `/api` prefix from all endpoint paths; change all port refs from `8080` to `8081` |

## Files NOT Changed

| File | Reason |
|------|--------|
| `booking_system_backend/server.py` | Routes are correct as-is; no prefix needed |
| `booking_system_frontend/src/services/api.ts` | Already calls routes without `/api` prefix |
| `booking_system_backend/tests/test_rest.py` | Already uses correct paths without prefix |
