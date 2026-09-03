# 2026-01-15 — Issue #1: Fix README API Endpoint Documentation

## Summary
GitHub issue #1 reported a mismatch: `booking_system_backend/README.md` documented REST endpoints with an `/api/*` prefix and port `8080`, while `server.py` has no prefix and runs on port `8081`.

## Decision
README-only fix chosen (Option 1). Code, frontend (`api.ts`), and tests were already consistent with the no-prefix / port-8081 reality — no code changes required.

## Changes Made
- `booking_system_backend/README.md`: removed `/api` prefix from all 6 endpoint paths in the API Reference table, Quick Start blurb, and all curl examples; corrected port from `8080` → `8081` throughout (Quick Start, all curl examples, MCP connect URL, Docker run command).

## Validation
- 29/29 tests passed (`pytest` from `booking_system_backend/`)
- `api.ts` and `test_rest.py` already correct — no changes needed

## Acceptance Criteria Status
- ✅ Consistent approach decided and applied
- ✅ `api.ts` already matches (no change needed)
- ✅ All tests pass

## GitHub
- Repo: `monojit21-automation/galaxium-travels`
- Issue #1 close: could not automate (no `gh` CLI or `GITHUB_TOKEN` available); user asked to close manually.
