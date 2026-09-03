# Plan: Add Seat Classes to Galaxium Travels

## Overview

Allow passengers to choose a seat class — **Economy**, **Business**, or **Galaxium** — when
booking a flight. The selected class is stored with the booking and displayed in the booking
confirmation and the My Bookings page.

**Scope:** Backend schema + API + MCP tool + frontend booking UI + booking display + per-class pricing.
**Out of scope:** Admin dashboard, seat inventory per class.
**Constraint:** `seat_class` column must be backward-compatible (nullable / default value).

## Seat Class Reference

| Class | Color | Price Multiplier |
|-------|-------|-----------------|
| Economy | Green (`alien-green` / `text-green-400`) | 1× base price |
| Business | Gold (`text-yellow-400`) | 1.3× base price |
| Galaxium | Cosmic gradient (`bg-cosmic-gradient`) | 1.5× base price |

---

## Data Flow

```
BookingModal (seat class selector)
  → bookFlight({ user_id, name, flight_id, seat_class })
  → POST /book { user_id, name, flight_id, seat_class }
  → BookingRequest schema (seat_class: optional str, default "Economy")
  → book_flight service (seat_class arg)
  → Booking ORM row (seat_class column, nullable String)
  → BookingOut schema (seat_class field)
  → BookingCard displays seat_class badge
```

---

## Sub-Tasks

---

### Sub-Task 1 — Backend: Database model + schemas + price field

**Intent**
Add `seat_class` as a nullable `String` column and `price` as a nullable `Float` column to
the `Booking` ORM model. Storing `price` on the booking captures the computed class price at
the time of booking. Update `BookingOut` to expose both fields and `BookingRequest` to accept
`seat_class` (optional, defaulting to `"Economy"`).

**Expected Outcomes**
- `Booking` model has `seat_class = Column(String, nullable=True)` and
  `price = Column(Float, nullable=True)`.
- `BookingOut` schema has `seat_class: str | None` and `price: float | None`.
- `BookingRequest` schema has `seat_class: str = "Economy"`.
- No migration needed — new nullable columns are safe with `create_all`.

**Todo List**
1. In `models.py`, add `seat_class = Column(String, nullable=True)` and
   `price = Column(Float, nullable=True)` to the `Booking` class.
2. In `schemas.py`, add `seat_class: str | None = None` and `price: float | None = None`
   to `BookingOut`.
3. In `schemas.py`, add `seat_class: str = "Economy"` to `BookingRequest`.

**Relevant Context**
- `booking_system_backend/models.py` — `Booking` class; other columns are non-nullable `String`
- `booking_system_backend/schemas.py` — `BookingOut` (lines 24-32), `BookingRequest` (lines 18-21)
- No migration framework; `init_db()` calls `Base.metadata.create_all()` — new nullable columns
  are safe to add without dropping the DB

**Status:** [ ] pending

---

### Sub-Task 2 — Backend: Service + REST endpoint + MCP tool

**Intent**
Thread `seat_class` through the booking service so it is persisted along with the computed
price. The service applies the multiplier and stores the final price on the booking row.
Update the REST endpoint and MCP tool to accept and forward `seat_class`.

**Price multiplier logic (applied in service):**
- `"Economy"` → `flight.price * 1.0`
- `"Business"` → `flight.price * 1.3`
- `"Galaxium"` → `flight.price * 1.5`

**Expected Outcomes**
- `book_flight` service computes and stores the correct `price` for the chosen class.
- `book_flight` service creates the `Booking` row with both `seat_class` and `price` set.
- `POST /book` accepts the optional `seat_class` field from the request body.
- The `book_flight` MCP tool accepts an optional `seat_class` parameter.

**Todo List**
1. In `services/booking.py`, add `seat_class: str = "Economy"` parameter to `book_flight`.
2. Define the multiplier map `{"Economy": 1.0, "Business": 1.3, "Galaxium": 1.5}` and
   compute `booking_price = flight.price * multiplier`.
3. Pass `seat_class` and `price=booking_price` when constructing the `Booking` ORM object.
4. In `server.py`, update `book_flight_endpoint` to pass `request.seat_class` to the service.
5. In `server.py`, add `seat_class: str = "Economy"` parameter to the `book_flight` MCP tool
   and pass it through to the service call.

**Relevant Context**
- `booking_system_backend/services/booking.py` — `book_flight` function (line 7); `Booking`
  object created at line ~44
- `booking_system_backend/server.py` — REST route at line 145, MCP tool at line 30
- Service pattern: functions return `XxxOut | ErrorResponse`; never raise exceptions

**Status:** [ ] pending

---

### Sub-Task 3 — Backend: Tests

**Intent**
Update existing booking tests to cover `seat_class` and computed `price`, and verify they
are stored and returned correctly. Existing tests must continue to pass (no `seat_class`
arg = defaults to `"Economy"`, price = `flight.price * 1.0`).

**Expected Outcomes**
- All 29 existing tests still pass.
- `test_book_flight_success` (REST + service) asserts `seat_class == "Economy"` and
  `price == flight.price * 1.0`.
- New test(s) assert non-default classes return correctly multiplied prices.

**Todo List**
1. In `tests/test_services.py`, add assertions for `result.seat_class == "Economy"` and
   `result.price == flight.price * 1.0` in `test_book_flight_success`.
2. Add a new service test `test_book_flight_business_class` that passes `seat_class="Business"`
   and asserts `seat_class == "Business"` and `price == flight.price * 1.3`.
3. Add a new service test `test_book_flight_galaxium_class` that passes `seat_class="Galaxium"`
   and asserts `seat_class == "Galaxium"` and `price == flight.price * 1.5`.
4. In `tests/test_rest.py`, add assertions for `data["seat_class"] == "Economy"` and
   `data["price"] == flight.price * 1.0` in `test_book_flight_success`.
5. Add a new REST test posting `seat_class="Business"` and asserting the returned price is
   `flight.price * 1.3`.
6. Run `pytest` and confirm all tests pass.

**Relevant Context**
- `booking_system_backend/tests/test_rest.py` — `test_book_flight_success` at line 92
- `booking_system_backend/tests/test_services.py` — `test_book_flight_success` at line 75
- `conftest.py` — test DB is in-memory SQLite with fresh state per test

**Status:** [ ] pending

---

### Sub-Task 4 — Frontend: Types + API service

**Intent**
Add `seat_class` and `price` to the TypeScript interfaces so the frontend can send the class
and display the computed price from the booking response.

**Expected Outcomes**
- `Booking` interface has `seat_class?: string` and `price?: number`.
- `BookingRequest` interface has `seat_class?: string`.
- `bookFlight` passes `seat_class` in the request body automatically (no code change needed).

**Todo List**
1. In `src/types/index.ts`, add `seat_class?: string` and `price?: number` to the `Booking`
   interface.
2. In `src/types/index.ts`, add `seat_class?: string` to the `BookingRequest` interface.
3. `src/services/api.ts` — no change needed; `bookFlight` posts the full `data` object.

**Relevant Context**
- `booking_system_frontend/src/types/index.ts` — `Booking` (lines 13-19),
  `BookingRequest` (lines 28-32)
- `booking_system_frontend/src/services/api.ts` — `bookFlight` posts `data` directly (line 80)

**Status:** [ ] pending

---

### Sub-Task 5 — Frontend: BookingModal seat class selector + dynamic price

**Intent**
Add a seat class selector to the booking confirmation modal. Each option is styled with its
class colour. The price displayed in the modal updates live as the user selects a class.
The selected class is sent with the `bookFlight` call.

**Seat class pill styles:**
- **Economy** — border/text in green (`border-green-400 text-green-400`); selected bg: `bg-green-400/20`
- **Business** — border/text in gold (`border-yellow-400 text-yellow-400`); selected bg: `bg-yellow-400/20`
- **Galaxium** — uses cosmic gradient border and text (`bg-cosmic-gradient` text white); selected: full gradient fill

**Price display:**
- Compute `displayPrice = flight.price * multiplier` where multiplier is `1.0 / 1.3 / 1.5`
  based on `seatClass` state.
- Replace the static `formatCurrency(flight.price)` in the price block with
  `formatCurrency(displayPrice)`.

**Expected Outcomes**
- Modal shows three pill-style toggle buttons: Economy (green), Business (gold), Galaxium (cosmic).
- Economy is selected by default; price shows base price.
- Selecting Business updates the price to `base * 1.3`; Galaxium to `base * 1.5`.
- Selected pill is visually highlighted; unselected pills show outlined style.
- `seat_class` is sent in the `bookFlight` call.
- `npm run build` passes with no TypeScript errors.

**Todo List**
1. Add `seatClass` state (`useState<string>("Economy")`) to `BookingModal`.
2. Define `SEAT_CLASSES` config array in the component:
   `[{ label: "Economy", value: "Economy", multiplier: 1.0, style: ... }, ...]`
   with the colour tokens listed above.
3. Add the seat class pill selector section between the passenger info block and the price block.
4. Derive `displayPrice = flight.price * multiplier` from the selected entry.
5. Replace `formatCurrency(flight.price)` in the price section with `formatCurrency(displayPrice)`.
6. Pass `seat_class: seatClass` in the `bookFlight` call inside `handleConfirmBooking`.
7. Reset `seatClass` to `"Economy"` when `onClose` is called.

**Relevant Context**
- `booking_system_frontend/src/components/bookings/BookingModal.tsx` — `handleConfirmBooking`
  at line 23; price block at lines ~117-124; modal JSX from line 53
- Existing style tokens: `glass-card`, `bg-cosmic-gradient`, `text-star-white`,
  `text-star-white/60`; Tailwind custom colors defined in `tailwind.config.js`
- `booking_system_frontend/src/components/common/Button.tsx` — available for reuse

**Status:** [ ] pending

---

### Sub-Task 6 — Frontend: BookingCard seat class + price display

**Intent**
Display the seat class badge and the booking-time price (stored on the booking) on each
card in My Bookings. Use the class colour for the badge. Fall back gracefully when either
field is absent (old bookings).

**Badge colour mapping:**
- `"Economy"` → `text-green-400 border-green-400`
- `"Business"` → `text-yellow-400 border-yellow-400`
- `"Galaxium"` → use `bg-cosmic-gradient` with white text (inline gradient badge)

**Expected Outcomes**
- `BookingCard` shows a coloured seat class badge below the route heading when
  `booking.seat_class` is present.
- Price row shows `booking.price` (the class-adjusted price stored at booking time) when
  available, falling back to `flight.price` for old bookings.
- Cards without `seat_class` or `price` render without errors.
- `npm run build` passes.

**Todo List**
1. In `BookingCard.tsx`, add a helper `getSeatClassStyle(seatClass)` that returns the
   appropriate Tailwind classes for each class value.
2. Add the seat class badge element inside the Flight Details section, below the route
   heading, rendered only when `booking.seat_class` is truthy.
3. Update the price row to display `booking.price ?? flight.price` (prefer stored booking
   price, fall back to flight's base price).

**Relevant Context**
- `booking_system_frontend/src/components/bookings/BookingCard.tsx` — price row at line 94;
  `booking: Booking` prop already typed from `types/index.ts`
- After Sub-Task 4, `booking.seat_class` will be typed as `string | undefined`

**Status:** [ ] pending

---

### Sub-Task 7 — Backend: Seed data update

**Intent**
Update `seed.py` so demo bookings are seeded with a random `seat_class` and the correctly
computed `price`, making the My Bookings page representative on a fresh run.

**Expected Outcomes**
- Each of the 20 seeded bookings has a random `seat_class` and the corresponding `price`.

**Todo List**
1. In `seed.py`, add `seat_classes = ["Economy", "Business", "Galaxium"]` and
   `multipliers = {"Economy": 1.0, "Business": 1.3, "Galaxium": 1.5}`.
2. In the booking loop, pick `seat_class = random.choice(seat_classes)`, look up the
   flight's base price, and compute `price = flight_price * multipliers[seat_class]`.
3. Pass `seat_class` and `price` when constructing each `Booking`.
4. Update the lookup so the loop can access the seeded flights' prices (query flights by ID
   or build a `{flight_id: price}` dict before the loop).

**Relevant Context**
- `booking_system_backend/seed.py` — `Booking` construction at line 55
- Seed runs on every startup via lifespan (idempotent — clears and re-inserts)

**Status:** [ ] pending

---

## Files Changed

| File | Change |
|------|--------|
| `booking_system_backend/models.py` | Add `seat_class` + `price` columns to `Booking` |
| `booking_system_backend/schemas.py` | Add `seat_class` + `price` to `BookingOut`; `seat_class` to `BookingRequest` |
| `booking_system_backend/services/booking.py` | Add `seat_class` param; compute + persist `price` |
| `booking_system_backend/server.py` | Forward `seat_class` in REST route and MCP tool |
| `booking_system_backend/tests/test_rest.py` | Assert `seat_class` + `price`; add class tests |
| `booking_system_backend/tests/test_services.py` | Assert `seat_class` + `price`; add class tests |
| `booking_system_backend/seed.py` | Seed bookings with random seat class + computed price |
| `booking_system_frontend/src/types/index.ts` | Add `seat_class` + `price` to interfaces |
| `booking_system_frontend/src/components/bookings/BookingModal.tsx` | Seat class pill selector + live price |
| `booking_system_frontend/src/components/bookings/BookingCard.tsx` | Seat class badge + booking price display |
