# EventPulse — Technical Architecture & Systems Design

**Document Version:** 1.1.0  
**Architectural Style:** High-Performance Modular Monolith with Event-Driven Outbox  
**Primary Target Platform:** Java 21 LTS · Spring Boot 3.4 · PostgreSQL 16 · Redis 7 · React 18 / TypeScript  

---

## 1. Architectural Philosophy & Strategy

EventPulse adopts a **Domain-Driven Modular Monolith** architecture. 

### Why Modular Monolith Over Premature Microservices?
1. **Single Source of Truth & ACID Guarantees:** Critical ticketing operations require transactional consistency across inventory allocation, order creation, and payment ledger entries. Distributed 2-phase commits (2PC) or Sagas across dozens of microservices introduce severe latency, partial failure recovery overhead, and eventual consistency lag during high-concurrency ticket drops.
2. **Operational Simplicity:** A single deployable artifact eliminates distributed tracing complexity, inter-service network hops (serializing/deserializing JSON over HTTP), and complex orchestration for early-to-mid stage deployments.
3. **Clean Module Boundaries (Microservice-Ready):** Modules communicate via strictly typed Java interfaces, DTOs, and asynchronous application events. If traffic warrants splitting the `queue` or `checkin` module into dedicated services in the future, the boundary is already isolated.

---

## 2. High-Level System Architecture Diagram

```
                        ┌─────────────────────────────────────────────────────────────┐
                        │             CLIENT TIER (React + TypeScript)                │
                        │  Customer Portal  │  Organizer Hub  │  Gate Scanner Mobile  │
                        └──────────────┬───────────────────┬──────────────────────────┘
                                       │ HTTPS / WSS       │ SSE (Queue & Live Ops)
                                       ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                REVERSE PROXY / INGRESS (Nginx / Cloudflare)                     │
│                             SSL Termination, WAF, Edge Caching, Static Assets                   │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        EVENTPULSE APPLICATION CORE (Spring Boot 3.4)                            │
│                                                                                                 │
│  ┌───────────────────┐  ┌────────────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │   Auth & RBAC     │  │  Organizers & Team │  │  Venues & Seating │  │  Events & Catalog   │  │
│  └─────────┬─────────┘  └──────────┬─────────┘  └─────────┬─────────┘  └──────────┬──────────┘  │
│            │                       │                      │                       │             │
│  ┌─────────┴─────────┐  ┌──────────┴─────────┐  ┌─────────┴─────────┐  ┌──────────┴──────────┐  │
│  │   Virtual Queue   │  │  Inventory Engine  │  │   Order Machine   │  │   Payment Gateway   │  │
│  │  (Token Bucket)   │  │ (Distributed Hold) │  │   (State Mgmt)    │  │   (Idempotency)     │  │
│  └─────────┬─────────┘  └──────────┬─────────┘  └─────────┬─────────┘  └──────────┬──────────┘  │
│            │                       │                      │                       │             │
│  ┌─────────┴─────────┐  ┌──────────┴─────────┐  ┌─────────┴─────────┐  ┌──────────┴──────────┐  │
│  │ Digital Ticketing │  │ Gate Check-in Ops  │  │ Demand & Analytics│  │ Notification Engine │  │
│  │  (HMAC/QR Engine) │  │ (Offline Protocol) │  │  (Live Telemetry) │  │ (Email / SMS Outbox)│  │
│  └───────────────────┘  └────────────────────┘  └───────────────────┘  └─────────────────────┘  │
│                                                                                                 │
│                     Internal Asynchronous Event Bus / Transactional Outbox                      │
└──────────────────────────┬──────────────────────────────────────────┬───────────────────────────┘
                           │                                          │
                           ▼                                          ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────────┐
│           POSTGRESQL 16 (Primary DB)         │  │            REDIS 7 (In-Memory Engine)        │
│  - Relational Integrity & Strict Constraints │  │  - Atomic Seat Holds (Lua Scripts)           │
│  - Optimistic/Pessimistic Row Locks          │  │  - Sliding Window Rate Limiting              │
│  - Read Replicas for High-Read Catalogs      │  │  - Virtual Queue Ticket Bucket               │
│  - Transactional Outbox Pattern Table        │  │  - Session & Cache Storage                   │
└──────────────────────────────────────────────┘  └──────────────────────────────────────────────┘
```

---

## 3. Core Modules & Domain Boundaries

| Module | Responsibilities | Key Dependencies |
|---|---|---|
| `common` | Base DTOs, unified API response wrapper, error codes, security utils, global exception handler. | None |
| `auth` | User registration, authentication, JWT generation/revocation, password hashing (BCrypt), RBAC filter. | `users` |
| `users` | Customer profiles, preferences, notification settings, GDPR data export/erasure. | `common` |
| `organizations`| Multi-tenant organization accounts, team memberships, role assignment (`FINANCE`, `EVENT_MANAGER`, etc.). | `users`, `auth` |
| `venues` | Physical venue definitions, sections, interactive seat row/column geometry, accessibility flags. | `organizations` |
| `events` | Event metadata, schedules, sessions, ticket tiers, sales windows, fair-access configurations. | `venues`, `organizations` |
| `inventory` | Core seat & capacity ledger. Holds, locks, releases, seat status state machine. | `events`, `venues` |
| `queue` | High-demand virtual waiting room, admission tokens, queue position SSE stream, bot rate limiter. | `redis`, `events` |
| `orders` | Order creation, tax/fee calculation, coupon application, order lifecycle state machine. | `inventory`, `users` |
| `payments` | Gateway abstraction (Stripe/Razorpay/Mock), payment intents, webhook verification, idempotency store. | `orders` |
| `ticketing` | Cryptographic ticket generation (signed HMAC-SHA256 payload), wallet export, secure transfers. | `orders`, `events` |
| `checkin` | Gate configuration, staff assignment, live scan validation, offline sync conflict resolution. | `ticketing` |
| `liveops` | Real-time entry velocity, gate balancing recommendations, attendance heatmaps. | `checkin` |
| `notifications`| Asynchronous transactional emails (booking confirmations, reminders, cancellations). | `orders` |
| `analytics` | Organizer revenue reports, sell-through velocity, attendee geography, conversion funnels. | `orders`, `checkin` |
| `audit` | Append-only audit log for sensitive mutations (pricing, cancellations, refunds, permission changes).| All modules |

---

## 4. Deep-Dive: Concurrency & The Seat Inventory Engine

The most critical technical challenge in event ticketing is the **Double-Booking Hazard**: when thousands of fans attempt to buy the exact same front-row seat at the identical millisecond.

### The Two-Phase Reservation Strategy
EventPulse enforces a resilient two-phase reservation protocol:

```
[Customer Selects Seat A12]
         │
         ▼
[Step 1: Check Redis Hold Lock via Lua Script]
         │
         ├── [Already Held/Sold] ──> Returns 409 CONFLICT ("Seat is currently held by another user")
         │
         └── [Available]
                 │
                 ▼
[Step 2: Atomic Redis Key Creation]
Key: `event:{eventId}:seat:{seatId}:hold`
Value: `{"userId":"...", "orderId":"...", "expiresAt": 1718293920}`
TTL: 480 seconds (8 minutes)
                 │
                 ▼
[Step 3: Database Transactional Hold]
UPDATE seat_inventory 
SET status = 'HELD', hold_user_id = :userId, hold_expires_at = :expiresAt, version = version + 1
WHERE id = :seatId AND status = 'AVAILABLE';
                 │
                 ▼
[Seat A12 is secured for 8 minutes. Customer proceeds to Checkout]
```

### Redis Atomic Lua Script for Holds
```lua
-- KEYS[1]: hold_key (e.g. "hold:event:101:seat:500")
-- ARGV[1]: user_id
-- ARGV[2]: ttl_seconds (480)
local current = redis.call('GET', KEYS[1])
if current then
    return 0 -- Failed: already held
else
    redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
    return 1 -- Success: acquired hold
end
```

### Failure & Edge-Case Handling Matrix (Seat Holds)
PostgreSQL is the permanent source of truth for all inventory state. Redis acts as a fast high-concurrency admission lease.

| Scenario | System Behavior & Invariant Defense |
|---|---|
| **a. Redis Unavailable** | System enters graceful degradation: falls back to PostgreSQL row-level pessimistic lock (`SELECT ... FOR UPDATE NOWAIT`) with controlled concurrency limits. |
| **b. PostgreSQL Unavailable** | Redis hold is aborted; transient 503 error returned. Permanent state is never committed without PostgreSQL. |
| **c. Redis Succeeds + PostgreSQL Fails** | **Compensating Action:** The backend catches the DB transaction exception and immediately invokes Redis `DEL hold:event:...:seat:...` to release the lease, preventing "phantom holds". |
| **d. PostgreSQL Succeeds + Client Disconnects** | Hold TTL naturally expires after 8 minutes. Scheduled `@Scheduled` worker reclaims DB seat back to `AVAILABLE`. |
| **e. Hold Expiration During Checkout** | Order creation/payment confirmation validates `hold_expires_at > NOW()`. If expired, returns `410 GONE / HOLD_EXPIRED` and prompts user to reselect. |
| **f. Payment Succeeds Near Expiration** | Atomic validation in payment webhook: if hold is still active, confirms `SOLD`. In the rare event the hold expired and seat was purchased by another buyer, system initiates an automatic full refund with audit notification. |

---

## 5. Virtual Queue & High-Demand Traffic Governor

During blockbuster ticket on-sales (e.g., *Coimbatore Music Festival*):
1. **Traffic Surge:** 50,000 users arrive within 2 minutes for 20,000 seats. Direct checkout would saturate PostgreSQL connection pools.
2. **Governor Protocol:**
   - Traffic for high-demand events is routed to `/api/v1/queue/{eventId}/join`.
   - User is assigned a monotonically incremented queue number in Redis using `INCR queue:{eventId}:counter`.
   - An admission worker periodically releases a configured batch of users (e.g., 200 users per 30 seconds) by updating `queue:{eventId}:active_admitted_threshold`.
   - Admitted users receive a cryptographically signed **Admission Token** (JWT with 10-minute expiry) allowing them to query seat maps and hold inventory.
   - Unauthorized checkout attempts without an Admission Token are rejected with `429 Too Many Requests`.

---

## 6. Payment Architecture & Idempotency Engine

Financial integrity demands strict idempotency:
- Every mutating request to `/api/v1/orders` and `/api/v1/payments/intent` requires an `Idempotency-Key: <UUID>` header.
- The `IdempotencyFilter` checks a dedicated PostgreSQL table / Redis cache:
  - If the key is new: creates a record with status `IN_PROGRESS` and executes the transaction.
  - If the key is currently `IN_PROGRESS`: returns `409 Conflict` (request already processing).
  - If the key has `COMPLETED`: returns the cached HTTP response and body immediately without re-executing payment or inventory logic.
- **Payment Gateway Webhook Handling:**
  - Webhooks from gateways (Stripe/Razorpay) are cryptographically validated using HMAC secret signatures.
  - Webhook events are processed idempotently using the gateway's unique `event_id`. Duplicate webhook deliveries return `200 OK` immediately.

---

## 7. Digital Ticketing & Asymmetric Cryptographic QR Verification

### Cryptographic Security Model (Asymmetric Key Architecture)
To ensure offline gate scanner devices cannot be compromised to mint fraudulent tickets:
1. **Backend Authority (Private Key):** The backend server holds the **Private Signing Key** ($K_{\text{private}}$) in secure environment configuration / HSM. It generates digital signatures using **ECDSA SHA-256 (P-256)** or **Ed25519**.
2. **Field Scanner Authority (Public Key Only):** Gate scanners only receive the **Public Verification Key** ($K_{\text{public}}$) bundled with the offline event manifest. Scanners can verify authenticity offline at the gate but possess zero credentials capable of forging or generating valid tickets.
3. **Key Rotation & Versioning:** Every ticket header embeds a Key Identifier (`kid`), e.g., `kid: "ep-key-2027-v1"`, allowing organizers and the platform to rotate keys between events or revoke compromised public keys.

### QR Payload Encoding
The QR code encodes a signed compact token:
$$\text{Payload} = \text{Base64Url}(\text{Header}) \,.\, \text{Base64Url}(\text{Claims}) \,.\, \text{Base64Url}(\text{Signature}_{K_{\text{private}}})$$

Header:
```json
{
  "alg": "ES256",
  "typ": "EP-TKT",
  "kid": "ep-key-2027-v1"
}
```

Claims:
- `tid`: Ticket UUID
- `eid`: Event UUID
- `sec`: Section / Row / Seat (or GA)
- `exp`: Event end timestamp
- `jti`: Unique ticket nonce (prevents replay)

Where Claims include:
- `tid`: Ticket UUID
- `eid`: Event UUID
- `sec`: Section / Row / Seat (or GA)
- `exp`: Event end timestamp
- `jti`: Unique ticket nonce

### Check-in Gate Architecture & Offline Protocol
1. **Online Scanning (Normal):**
   - Gate agent scanner reads QR code.
   - Makes authenticated `POST /api/v1/checkin/validate` with `gate_id` and `qr_payload`.
   - Server verifies signature, validates state in DB (`status == ISSUED`), transitions atomically to `USED`, and logs `checkin_logs` entry.
   - Latency: <150ms.
2. **Offline Mode (Network Outage at Stadium):**
   - Scanner app pre-caches the event's Public Key / HMAC verification key and an encrypted SQLite list of authorized Ticket IDs + hashes.
   - When offline, scanner locally verifies cryptographic signature and marks the ticket as checked-in in local SQLite.
   - When connection is re-established, the scanner pushes queued check-in sync bundles:
     - If a ticket was scanned only once: successfully committed to central DB.
     - If scanned at two different offline gates: central DB accepts the earliest timestamp, flags the second as `SUSPECT_DUPLICATE_ENTRY`, and raises an alert in the Organizer Live Ops dashboard.

---

## 8. Frontend Architecture & Design Philosophy

The frontend is constructed using **Vite, React 18, and TypeScript**, completely decoupling Customer Discovery from Organizer Business Operations:

### Application Modules:
1. **Customer Ticketing Portal (`/` to `/events/*`):**
   - High-contrast, clean typography, dark-mode first aesthetic.
   - Interactive SVG/Canvas seat selection component showing real-time seat availability with intuitive pan/zoom.
   - 3-step checkout drawer: Cart Summary $\rightarrow$ Contact Information $\rightarrow$ Payment $\rightarrow$ Instant Confirmed Pass.
2. **Organizer Workspace (`/organizer/*`):**
   - Enterprise dashboard for event creation, tiered pricing matrix, dynamic ticket quotas, sales velocity graphs, and financial settlement ledgers.
3. **Gate Scanner Web App (`/scanner/*`):**
   - High-contrast, full-screen mobile camera QR scanner optimized for bright sunlight and rapid throughput.
   - Full audio/haptic feedback (vibration + tone on valid/invalid).
4. **Platform Administration (`/admin/*`):**
   - Multi-tenant tenant verification, global audit logging, system health telemetry.

---

## 9. Technology Stack Matrix

| Layer | Technology | Rationale |
|---|---|---|
| **Language & Runtime** | Java 21 LTS / 24 | Strong typing, virtual threads (Project Loom) for high I/O throughput, production memory model. |
| **Backend Framework** | Spring Boot 3.4.x | Industry standard, robust ecosystem (Spring Security, Spring Data JPA, Actuator). |
| **Relational Database** | PostgreSQL 16 | ACID guarantees, JSONB support for dynamic seat layouts, row-level locking, rich indexing. |
| **Cache & Hold State** | Redis 7 | Sub-millisecond atomic key-value operations, TTL key expiration, distributed locking. |
| **Frontend Framework** | React 18 + TypeScript | Component reusability, strict compile-time types, vast ecosystem for charts and interactive SVG. |
| **Build & Tooling** | Maven (BE) / Vite (FE) | Fast builds, hot module replacement, reproducible dependency management. |
| **Documentation** | OpenAPI 3.0 / Swagger | Automated contract generation, interactive API testing. |
| **Testing** | JUnit 5, Mockito, AssertJ, Testcontainers | Unit, integration, concurrency, and end-to-end API verification. |
| **Containerization** | Docker, Docker Compose | Consistent local development matching production deployment topology. |
