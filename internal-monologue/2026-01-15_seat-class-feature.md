# 2026-01-15 — Seat Class Feature

## Summary
Implemented the full seat-class feature from `plans/seat-class-plan.md` across backend and frontend.

## Changes Made

### Backend
- `models.py`: Added `seat_class = Column(String, nullable=True)` and `price = Column(Float, nullable=True)` to `Booking`.
- `schemas.py`: Added `seat_class: str | None = None` and `price: float | None = None` to `BookingOut`; added `seat_class: str = "Economy"` to `BookingRequest`.
- `services/booking.py`: Added `_SEAT_MULTIPLIERS` dict, `seat_class` param, multiplier computation, and passed both fields into the `Booking` ORM constructor.
- `server.py`: Forwarded `seat_class` in both the REST endpoint and the MCP `book_flight` tool.
- `seed.py`: Seeded each of 20 demo bookings with a random `seat_class` and correctly computed `price`.

### Tests (32 passing)
- `test_services.py`: Added assertions for `seat_class == "Economy"` and `price == base * 1.0` in existing success test; added `test_book_flight_business_class` and `test_book_flight_galaxium_class`.
- `test_rest.py`: Added assertions for `seat_class`/`price` in existing success test; added `test_book_flight_business_class` REST test.

### Frontend
- `src/types/index.ts`: Added `seat_class?: string` and `price?: number` to `Booking`; `seat_class?: string` to `BookingRequest`.
- `BookingModal.tsx`: Added `SEAT_CLASSES` config, `seatClass` state, pill selector UI between passenger info and price, live `displayPrice` computation, `seat_class` in `bookFlight` call, and `seatClass` reset on close.
- `BookingCard.tsx`: Added `getSeatClassStyle` helper, seat class badge below route heading, and `booking.price ?? flight.price` fallback in the price row.

## Validation
- `pytest`: 32/32 passed (3 new tests added).
- `npm run build`: clean build, no TypeScript errors.
