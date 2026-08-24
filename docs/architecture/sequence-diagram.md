# Booking Flow — Sequence Diagram

End-to-end flow for a user booking a flight, traced across
[`booking_system_frontend/src/services/api.ts`](../../booking_system_frontend/src/services/api.ts),
[`booking_system_backend/server.py`](../../booking_system_backend/server.py),
and [`booking_system_backend/services/booking.py`](../../booking_system_backend/services/booking.py).

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI<br/>(pages/Flights.tsx)
    participant ApiTs as services/api.ts<br/>(Axios)
    participant REST as server.py<br/>(FastAPI)
    participant SvcUser as services/user.py
    participant SvcBooking as services/booking.py
    participant DB as SQLite<br/>(booking.db)

    note over UI: User clicks "Book Now" on a flight card

    alt User not signed in
        UI->>ApiTs: registerUser({name, email})<br/>POST /register
        ApiTs->>REST: HTTP POST /register
        REST->>SvcUser: register_user(db, name, email)
        SvcUser->>DB: SELECT WHERE email=?
        alt Email already exists
            SvcUser-->>REST: ErrorResponse{EMAIL_EXISTS}
            REST-->>ApiTs: HTTP 200 + ErrorResponse
            ApiTs-->>UI: isErrorResponse() == true → show error
        else New user
            SvcUser->>DB: INSERT User
            SvcUser-->>REST: UserOut
            REST-->>ApiTs: HTTP 200 + UserOut
            ApiTs-->>UI: user stored in useUser() context
        end

        UI->>ApiTs: getUserByCredentials(name, email)<br/>GET /user?name=&email=
        ApiTs->>REST: HTTP GET /user
        REST->>SvcUser: get_user(db, name, email)
        SvcUser->>DB: SELECT WHERE name=? AND email=?
        alt Not found
            SvcUser-->>REST: ErrorResponse{USER_NOT_FOUND}
            REST-->>ApiTs: HTTP 200 + ErrorResponse
            ApiTs-->>UI: isErrorResponse() == true → show error
        else Found
            SvcUser-->>REST: UserOut
            REST-->>ApiTs: HTTP 200 + UserOut
            ApiTs-->>UI: user stored in useUser() context
        end
    end

    note over UI,DB: ── QUOTE / HOLD STEP (NOT IMPLEMENTED) ──────────────────
    note over UI: booking_system_inventory_hold_service does not exist.<br/>No quote or hold call is made before booking.<br/>Seat availability is checked inline during book_flight().

    UI->>ApiTs: bookFlight({user_id, name, flight_id})<br/>POST /book
    ApiTs->>REST: HTTP POST /book
    REST->>SvcBooking: book_flight(db, user_id, name, flight_id)

    SvcBooking->>DB: SELECT Flight WHERE flight_id=?
    alt Flight not found
        SvcBooking-->>REST: ErrorResponse{FLIGHT_NOT_FOUND}
        REST-->>ApiTs: HTTP 200 + ErrorResponse
        ApiTs-->>UI: isErrorResponse() == true → toast.error
    end

    SvcBooking->>DB: check seats_available >= 1
    alt No seats
        SvcBooking-->>REST: ErrorResponse{NO_SEATS_AVAILABLE}
        REST-->>ApiTs: HTTP 200 + ErrorResponse
        ApiTs-->>UI: isErrorResponse() == true → toast.error
    end

    SvcBooking->>DB: SELECT User WHERE user_id=? AND name=?
    alt User not found
        SvcBooking-->>REST: ErrorResponse{USER_NOT_FOUND}
        REST-->>ApiTs: HTTP 200 + ErrorResponse
        ApiTs-->>UI: isErrorResponse() == true → toast.error
    else Name mismatch
        SvcBooking-->>REST: ErrorResponse{NAME_MISMATCH}
        REST-->>ApiTs: HTTP 200 + ErrorResponse
        ApiTs-->>UI: isErrorResponse() == true → toast.error
    end

    SvcBooking->>DB: UPDATE Flight SET seats_available -= 1
    SvcBooking->>DB: INSERT Booking(status="booked", booking_time=utcnow().isoformat())
    SvcBooking->>DB: COMMIT
    SvcBooking-->>REST: BookingOut
    REST-->>ApiTs: HTTP 200 + BookingOut
    ApiTs-->>UI: isErrorResponse() == false → toast.success
    UI->>ApiTs: getFlights() — reload to reflect updated seat count
    ApiTs->>REST: HTTP GET /flights
    REST-->>ApiTs: HTTP 200 + Flight[]
    ApiTs-->>UI: flight list re-rendered with updated seats_available
```

## Notes

- All HTTP responses are **status 200**, including errors. The frontend uses `isErrorResponse()` (checks `response.success === false`) to distinguish success from failure.
- There is no quote or hold step. `booking_system_inventory_hold_service` does not exist in the repository.
- Seat decrement and booking insert happen in a single `db.commit()` — there is no two-phase hold. Concurrent requests are not protected by a DB-level lock.
- `booking_time` is stored as a plain string via `datetime.utcnow().isoformat()` — no timezone suffix.
