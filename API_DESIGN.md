# EventPulse — RESTful API Design & Contract Specification

**Document Version:** 1.0.0  
**API Prefix:** `/api/v1`  
**Protocol:** HTTPS / WSS / SSE  
**Standard Response Format:** JSON RFC 8259  
**Error Standard:** RFC 7807 Problem Details  

---

## 1. API Architecture Conventions

### 1.1 Universal Response Envelope
Every non-streaming response conforms to the standard `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "correlationId": "ep-req-9b8c-4f1a23e981",
  "timestamp": "2027-02-15T18:30:00.123Z",
  "message": "Operation completed successfully",
  "data": { ... },
  "metadata": {
    "page": 1,
    "size": 20,
    "totalElements": 142,
    "totalPages": 8
  }
}
```

### 1.2 Universal Error Envelope (RFC 7807)
```json
{
  "type": "https://eventpulse.io/errors/INVENTORY_ALREADY_HELD",
  "title": "Conflict - Inventory Unavailable",
  "status": 409,
  "detail": "Seat A12 is currently reserved by another active checkout session.",
  "instance": "/api/v1/events/9b8c/holds",
  "correlationId": "ep-req-9b8c-4f1a23e981",
  "timestamp": "2027-02-15T18:30:00.123Z",
  "errors": [
    {
      "field": "seatIds",
      "rejectedValue": ["seat-uuid-a12"],
      "message": "Seat cannot be held"
    }
  ]
}
```

### 1.3 Mandatory Headers
- `Authorization: Bearer <JWT_TOKEN>` (for secured endpoints)
- `X-Correlation-Id: <UUID>` (for distributed request tracking)
- `Idempotency-Key: <UUID>` (mandatory on `POST /orders`, `POST /payments/*`, `POST /refunds`)

---

## 2. API Endpoints by Domain Module

### 2.1 Authentication & Profile (`/api/v1/auth`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register customer account. |
| `POST` | `/auth/login` | Public | Authenticate user, returns access JWT & refresh token. |
| `POST` | `/auth/refresh` | Public | Refresh expired access JWT. |
| `GET` | `/auth/me` | Authenticated | Retrieve authenticated user profile & permissions. |
| `PUT` | `/auth/profile` | Authenticated | Update user profile & notification preferences. |

---

### 2.2 Organizations & Multi-Tenancy (`/api/v1/organizations`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/organizations` | Authenticated | Register new organization / business tenant. |
| `GET` | `/organizations/my` | Authenticated | List organizations where user has membership. |
| `GET` | `/organizations/{id}` | Org Member | Retrieve organization profile & settings. |
| `PUT` | `/organizations/{id}` | Org Owner/Admin | Update organization branding & payout details. |
| `GET` | `/organizations/{id}/members` | Org Admin | List team members and their roles. |
| `POST` | `/organizations/{id}/members` | Org Owner/Admin | Invite team member with designated role. |
| `DELETE`| `/organizations/{id}/members/{uid}`| Org Owner/Admin | Remove team member. |

---

### 2.3 Venues & Seating Geometry (`/api/v1/venues`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/venues` | Org Admin | Create venue with layout definition. |
| `GET` | `/venues` | Org Member | List venues managed by the organization. |
| `GET` | `/venues/{id}` | Authenticated | Get venue details and section blueprint. |
| `POST` | `/venues/{id}/sections`| Org Admin | Add seating section (GA or reserved). |
| `POST` | `/venues/{id}/sections/{sid}/seats/batch` | Org Admin | Bulk create seating geometry (rows/seats/coordinates). |
| `GET` | `/venues/{id}/layout` | Authenticated | Retrieve full SVG/grid coordinate layout for rendering. |

---

### 2.4 Events & Catalog Discovery (`/api/v1/events`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/events` | Public | Search and filter events (city, category, date, price, query). |
| `GET` | `/events/featured` | Public | Curated featured and trending events. |
| `GET` | `/events/{idOrSlug}` | Public | Detailed event page (info, sessions, tiers, policies, map). |
| `POST` | `/organizer/events` | Org Event Mgr | Draft new event with sessions and ticket tiers. |
| `PUT` | `/organizer/events/{id}` | Org Event Mgr | Update event details and sales schedule. |
| `POST` | `/organizer/events/{id}/publish` | Org Event Mgr | Validate inventory quotas and publish event live. |
| `POST` | `/organizer/events/{id}/cancel` | Org Owner/Admin | Trigger event cancellation and automated refund cascade. |

---

### 2.5 Seat Inventory, Availability & Holds (`/api/v1/events/{id}/...`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/events/{id}/sessions/{sid}/availability` | Public | Real-time seat status matrix (`AVAILABLE`, `HELD`, `SOLD`). |
| `POST` | `/events/{id}/sessions/{sid}/holds` | Authenticated | Ephemerally hold 1–6 seats for 8 minutes (atomic lock). |
| `DELETE`| `/events/{id}/sessions/{sid}/holds` | Authenticated | Explicitly release held seats (e.g. user abandons checkout). |
| `GET` | `/events/{id}/sessions/{sid}/holds/active` | Authenticated | Retrieve user's active hold session & remaining countdown. |

#### Request Example: `POST /events/{id}/sessions/{sid}/holds`
```json
{
  "ticketTypeId": "9b8c-4f1a23e981-tkt",
  "seatIds": ["seat-uuid-a12", "seat-uuid-a13"],
  "holdDurationSeconds": 480
}
```

#### Response Example:
```json
{
  "success": true,
  "data": {
    "holdSessionToken": "hst_9f81a7b204c3",
    "expiresAt": "2027-02-15T18:38:00.000Z",
    "remainingSeconds": 480,
    "heldSeats": [
      { "seatId": "seat-uuid-a12", "label": "Row A / Seat 12", "price": 1499.00 },
      { "seatId": "seat-uuid-a13", "label": "Row A / Seat 13", "price": 1499.00 }
    ],
    "subtotal": 2998.00,
    "estimatedFees": 150.00,
    "estimatedTaxes": 539.64,
    "estimatedTotal": 3687.64
  }
}
```

---

### 2.6 High-Demand Virtual Queue (`/api/v1/queue/{eventId}`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/queue/{eventId}/join` | Authenticated | Join the virtual waiting room; assigns queue position. |
| `GET` | `/queue/{eventId}/status` | Authenticated | Poll current queue position and estimated wait time. |
| `GET` | `/queue/{eventId}/stream` | Authenticated | **SSE Endpoint:** Live stream of queue progression. |
| `POST` | `/queue/{eventId}/claim-admission` | Authenticated | Exchange queue pass for cryptographic Admission Token. |

---

### 2.7 Orders & Checkout Lifecycle (`/api/v1/orders`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/orders` | Authenticated | Create order from active seat hold (`Idempotency-Key` required). |
| `GET` | `/orders/{orderId}` | Authenticated | Fetch order details, pricing breakdown, and status. |
| `GET` | `/orders/my` | Authenticated | List paginated booking history for customer. |

#### Request Example: `POST /orders`
```json
// Header: Idempotency-Key: e82c4015-812e-4b42-a16f-6d09f7a6f204
{
  "holdSessionToken": "hst_9f81a7b204c3",
  "contactEmail": "priya.attendee@gmail.com",
  "contactPhone": "+919876543210",
  "couponCode": "EARLYBIRD10"
}
```

---

### 2.8 Payments & Gateway Webhooks (`/api/v1/payments`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/payments/intent` | Authenticated | Initialize payment intent with gateway (Stripe/Razorpay/Mock). |
| `POST` | `/payments/confirm` | Authenticated | Client confirmation following gateway SDK success. |
| `POST` | `/payments/webhook/{provider}` | Public/Secure | Gateway webhook endpoint (verified via HMAC signature). |

---

### 2.9 Digital Tickets & Transfers (`/api/v1/tickets`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/tickets/my` | Authenticated | List all digital tickets held by authenticated user. |
| `GET` | `/tickets/{ticketId}` | Authenticated | Get full digital pass with cryptographic QR code payload. |
| `POST` | `/tickets/{ticketId}/transfer`| Authenticated | Securely transfer ticket ownership to another user's email. |
| `GET` | `/tickets/{ticketId}/history` | Authenticated | View immutable ownership transfer audit history. |

---

### 2.10 Gate Check-in & Live Operations (`/api/v1/checkin`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/checkin/validate` | Staff / Gate | Validate scanned QR code in real-time (<150ms response). |
| `GET` | `/checkin/manifest/{eventId}` | Staff / Gate | Download encrypted offline ticket manifest for gate client. |
| `POST` | `/checkin/sync-offline` | Staff / Gate | Push queued offline scans upon internet reconnection. |
| `GET` | `/checkin/live-telemetry/{eventId}`| Org / Staff | **SSE / REST:** Real-time gate traffic & entry velocity stats. |

#### Check-in Scan Response Schema:
```json
{
  "scanResult": "VALID", // 'VALID', 'ALREADY_USED', 'WRONG_GATE', 'REVOKED'
  "ticketId": "tkt-2027-abcd-efgh",
  "attendeeName": "Priya Sharma",
  "seatLabel": "Grandstand East / Row A / Seat 12",
  "gateName": "Gate A (East)",
  "scannedAt": "2027-02-15T18:45:12.450Z",
  "firstScanDetails": null
}
```

---

### 2.11 Recommendations & Operational Intelligence (`/api/v1/intelligence`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/intelligence/event-match/{eventId}` | Authenticated | Calculate personalized match percentage and reasons. |
| `POST` | `/intelligence/recommend-seats` | Public | Find optimal $N$ contiguous seats matching budget & view preference. |
| `GET` | `/intelligence/organizer/demand/{eventId}`| Org Event Mgr | Forecast sell-out timeline and velocity curves with confidence intervals. |
