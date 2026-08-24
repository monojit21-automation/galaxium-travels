# 2026-01-15 — Create docs/ONBOARDING.md

## What was asked
Create `docs/ONBOARDING.md` with six sections covering: application overview, tech stack, key components, unit test coverage, E2E test coverage, and deployment model.

## What I discovered (new this session)
- Backend `Dockerfile` exposes port `8080` but `server.py` binds to `8081` — port mismatch bug.
- Frontend Dockerfile referenced in README does not exist.
- No docker-compose file exists.
- No E2E or frontend unit tests of any kind.
- 24 backend pytest tests across 2 files (13 service-layer, 11 REST-layer).
- Missing REST test coverage: `NAME_MISMATCH`, `NO_SEATS_AVAILABLE`, `ALREADY_CANCELLED` paths.
- No MCP tool test coverage.

## What I created
- `docs/ONBOARDING.md` — 362 lines covering all six requested sections with Mermaid diagrams, tables, and data-flow sequence diagram.

## Rule compliance
- No public functions written; JSDoc rule not applicable.
- Wording kept concise.
