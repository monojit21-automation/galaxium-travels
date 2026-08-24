# 2026-01-15 — Create docs/audit/code-quality-summary.md

## What was asked
Analyse code quality across backend, frontend, and Java hold service. Produce a structured findings report with severity labels.

## What I read (new this session)
- `src/hooks/useUser.tsx` — full user object including email persisted to localStorage in plaintext
- `src/utils/formatters.ts` — console.error for observability; USD hardcoded with no currency field
- `src/components/user/UserIdentification.tsx` — only whitespace check before API call, no email format validation
- `src/components/bookings/BookingModal.tsx` — no seats_available guard before submit
- `src/components/bookings/BookingCard.tsx` — stale seat count used for isSoldOut
- `src/components/flights/FlightCard.tsx` — isSoldOut from local state only
- `seed.py` — deletes all data on every startup; no try/finally; bookings inserted without decrementing seats

## Findings summary
- 3 Critical, 7 High, 10 Medium, 7 Low across 21 files
- Top issues: no auth anywhere, seeds wipes DB on every restart, localStorage stores PII, seats race condition

## Files created
- `docs/audit/code-quality-summary.md`
