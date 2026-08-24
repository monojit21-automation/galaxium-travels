# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
Full-stack interplanetary travel booking app: **FastAPI + FastMCP backend** (Python) and **React 18 + TypeScript frontend** (Vite). Both run as separate servers.

## Port Assignments (Non-obvious)
- Backend runs on **port 8081** (not 8080 — README is wrong; actual value in `server.py` and `.env.example`)
- Frontend dev server runs on **port 5174** (not 5173 — configured in `vite.config.ts`)
- `VITE_API_URL` defaults to `http://localhost:8080` in `api.ts` hardcode but `.env.example` sets it to `http://localhost:8081` — always use `.env`

## Commands

### Backend (run from `booking_system_backend/`)
```bash
# Activate venv first
source .venv/bin/activate        # Unix
.venv\Scripts\activate           # Windows

python server.py                  # Run server (port 8081)
pytest                            # Run all tests
pytest tests/test_rest.py -k "test_get_flights_empty"   # Run single test
pytest tests/test_services.py -k "test_book_flight_success"
```

### Frontend (run from `booking_system_frontend/`)
```bash
npm run dev       # Dev server (port 5174)
npm run build     # tsc -b && vite build
npm run lint      # ESLint (TypeScript + React only; no JS files linted)
```

## Backend Architecture

- **`server.py`** — single file containing both FastAPI REST routes AND FastMCP tools; MCP is mounted at `/mcp`
- **`db.py`** — `SessionLocal`, `get_db` (FastAPI dependency), `init_db`
- **`models.py`** — SQLAlchemy ORM (`User`, `Flight`, `Booking`); datetime/times stored as `String`, not `DateTime`
- **`schemas.py`** — Pydantic models; `ErrorResponse` has `success: bool = False`, `error`, `error_code`, `details`
- **`services/`** — business logic; functions return `XxxOut | ErrorResponse` (never raise HTTP exceptions)
- **`seed.py`** — called on every startup via lifespan; idempotent

## Critical Backend Patterns

- **Error handling**: Services return `ErrorResponse` objects (not raise exceptions). REST endpoints return `Union[XxxOut, ErrorResponse]` — HTTP status is always 200 even for errors. Check `response.success == False` to detect errors.
- **MCP tools**: MCP tools in `server.py` open their own `SessionLocal()` (not using FastAPI's `get_db` dependency). If an `ErrorResponse` is returned, they `raise Exception(result.details or result.error)`.
- **ORM → schema**: Use `BookingOut.model_validate(obj)` (Pydantic v2), not `.from_orm()`. All `Out` schemas have `model_config` via `class Config: from_attributes = True`.
- **Error codes** in use: `EMAIL_EXISTS`, `USER_NOT_FOUND`, `NAME_MISMATCH`, `FLIGHT_NOT_FOUND`, `NO_SEATS_AVAILABLE`, `BOOKING_NOT_FOUND`, `ALREADY_CANCELLED`

## Testing (Backend)

- Tests **must** run from `booking_system_backend/` directory (pytest.ini sets `testpaths = tests`)
- `conftest.py` uses in-memory SQLite with `StaticPool`; each test gets a fresh DB (`scope="function"`)
- `client` fixture uses `monkeypatch` to replace `SessionLocal` in both `server` and `db` modules, and patches `seed` to a no-op
- `server.app.dependency_overrides[db_module.get_db]` is overridden and cleared after each test

## Frontend Architecture

- `src/services/api.ts` — single Axios instance; `VITE_API_URL` env var for base URL
- `src/types/index.ts` — all TypeScript interfaces mirroring backend schemas
- `isErrorResponse(response)` helper in `api.ts` checks `response.success === false`
- Tailwind custom colors defined in `tailwind.config.js`: `cosmic-purple`, `nebula-pink`, etc.
- No frontend test suite; `npm run build` (tsc + vite) is the validation step

## Frontend Code Style
- ESLint enforces `typescript-eslint` recommended + `react-hooks` + `react-refresh` rules
- All components are `.tsx`; utility/type files are `.ts`
- Types imported with `import type { ... }` syntax
