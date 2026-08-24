# Actors & Use Cases — Use Case Diagram

All actors and use cases identified from the frontend pages
([`booking_system_frontend/src/App.tsx`](../../booking_system_frontend/src/App.tsx),
[`src/services/api.ts`](../../booking_system_frontend/src/services/api.ts)),
the REST endpoints, and the MCP tools in
[`booking_system_backend/server.py`](../../booking_system_backend/server.py).

```mermaid
flowchart LR

    subgraph Actors
        HU(["Human User\n(Browser)"])
        AI(["AI Agent\n(MCP Client)"])
        DEV(["Developer /\nOps"])
    end

    subgraph UC_HU ["Human User Use Cases"]
        HU_1["Browse home page"]
        HU_2["Browse available flights"]
        HU_3["Search flights by\norigin or destination"]
        HU_4["Register new account\nwith name and email"]
        HU_5["Sign in with\nname and email"]
        HU_6["Book a flight"]
        HU_7["View own bookings"]
        HU_8["Cancel a booking"]
    end

    subgraph UC_AI ["AI Agent Use Cases (MCP tools)"]
        AI_1["list_flights --\nlist all flights"]
        AI_2["register_user --\nregister new user"]
        AI_3["get_user_id --\nlook up user by name and email"]
        AI_4["book_flight --\nbook seat for user"]
        AI_5["get_bookings --\nget all bookings for user"]
        AI_6["cancel_booking --\ncancel a booking by ID"]
    end

    subgraph UC_DEV ["Developer / Ops Use Cases"]
        DEV_1["View OpenAPI docs\nat /docs"]
        DEV_2["Health check\nGET /"]
        DEV_3["Seed demo data\non server startup"]
        DEV_4["Run backend\npytest suite"]
        DEV_5["Build and validate\nfrontend via npm run build"]
    end

    subgraph REST ["Backend REST Endpoints"]
        R1["GET /flights"]
        R2["POST /register"]
        R3["GET /user"]
        R4["POST /book"]
        R5["GET /bookings/&lbrace;user_id&rbrace;"]
        R6["POST /cancel/&lbrace;booking_id&rbrace;"]
        R7["GET /"]
    end

    subgraph MCP ["MCP Tools at /mcp"]
        M1["list_flights()"]
        M2["register_user()"]
        M3["get_user_id()"]
        M4["book_flight()"]
        M5["get_bookings()"]
        M6["cancel_booking()"]
    end

    HU --> HU_1 & HU_2 & HU_3 & HU_4 & HU_5 & HU_6 & HU_7 & HU_8
    AI --> AI_1 & AI_2 & AI_3 & AI_4 & AI_5 & AI_6
    DEV --> DEV_1 & DEV_2 & DEV_3 & DEV_4 & DEV_5

    HU_2 --> R1
    HU_3 --> R1
    HU_4 --> R2
    HU_5 --> R3
    HU_6 --> R4
    HU_7 --> R5
    HU_8 --> R6
    DEV_2 --> R7

    AI_1 --> M1
    AI_2 --> M2
    AI_3 --> M3
    AI_4 --> M4
    AI_5 --> M5
    AI_6 --> M6
```

## Notes

- **Human User** and **AI Agent** have symmetric capabilities — every action a user can perform via the UI has an equivalent MCP tool, and vice versa.
- **Search** (HU_3) is frontend-only — it filters the already-fetched flight list client-side; no dedicated search endpoint exists on the backend.
- `booking_system_inventory_hold_service` does not exist; no hold or quote actor is represented.
- The `GET /user` endpoint requires **both** name and email — there is no lookup by email alone.
