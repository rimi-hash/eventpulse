# EventPulse — Security Architecture, Privacy & Compliance Guide

**Document Version:** 1.0.0  
**Security Standard:** OWASP Top 10 / PCI-DSS Level 4 Compliant Design / ISO 27001 Alignment  

---

## 1. Threat Model & Defense-in-Depth Architecture

EventPulse processes financial transactions and issues high-value, digitally transferable admission tokens. The security model addresses the primary threat vectors targeting ticketing platforms:
1. **Automated Scalper Bots:** Rapid script-driven seat acquisition during high-demand drops.
2. **Double-Spending & Race Conditions:** Concurrent exploitation of checkout sessions to acquire identical inventory.
3. **Insecure Direct Object Reference (IDOR):** Attacking predictable numeric IDs to view or transfer other customers' tickets.
4. **QR Code Forgery & Replay:** Fabricating fake admission passes or intercepting screenshots to gain unauthorized gate entry.
5. **Payment Webhook Spoofing:** Submitting counterfeit gateway payment confirmations to issue tickets without payment.
6. **Data & Privacy Leakage:** Exposing customer Personally Identifiable Information (PII) on tickets or in public APIs.

---

## 2. Authentication, Session & Token Security

### 2.1 Password Hashing & Brute-Force Prevention
- Passwords are encrypted using **BCrypt** with an adaptive work factor of 12 (`BCryptPasswordEncoder`).
- Passwords must meet strict entropy requirements: minimum 8 characters, at least 1 uppercase letter, 1 number, and 1 special character.
- **Login Rate Limiter:** Redis-backed sliding window tracks failed authentication attempts by IP and email. After 5 consecutive failures, the account faces an exponential backoff lockout (15 minutes).

### 2.2 JWT Cryptographic Signing & Lifecycle
- **Access Tokens:** Signed with HMAC-SHA256 (`HS256`) using a 256-bit environment secret (`JWT_SECRET`). Short validity period of **15 minutes**.
- **Claims Sanitization:** Token payloads contain only essential identifiers:
  ```json
  {
    "sub": "user-uuid-9b8c",
    "email": "priya.attendee@gmail.com",
    "role": "CUSTOMER",
    "iat": 1718293920,
    "exp": 1718294820
  }
  ```
  *(Zero sensitive PII, phone numbers, or credentials stored inside tokens).*
- **Refresh Tokens:** High-entropy cryptographically random UUID stored in PostgreSQL with a 7-day TTL. Enforces **Refresh Token Rotation (RTR)**: exchanging a refresh token invalidates the previous token and issues a new pair.

---

## 3. Authorization & IDOR Mitigation

### 3.1 Role-Based Access Control (RBAC) Matrix

| Resource / Action | Public | CUSTOMER | ORG_MEMBER (Staff) | ORG_ADMIN / OWNER | PLATFORM_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Browse Events / Availability | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hold Seats & Checkout | ❌ | ✅ | ✅ | ✅ | ✅ |
| View Own Tickets & Orders | ❌ | ✅ (Own Only) | ✅ (Own Only) | ✅ (Own Only) | ✅ (All) |
| Transfer Own Ticket | ❌ | ✅ (Own Only) | ✅ (Own Only) | ✅ (Own Only) | ✅ |
| Scan & Validate QR at Gates | ❌ | ❌ | ✅ (Assigned) | ✅ (Org Events) | ✅ |
| Create / Edit Events | ❌ | ❌ | ❌ | ✅ (Org Only) | ✅ |
| View Org Financials & Payouts | ❌ | ❌ | ❌ | ✅ (Org Owner) | ✅ |
| Suspend Org / Global Config | ❌ | ❌ | ❌ | ❌ | ✅ |

### 3.2 IDOR Defense Architecture
1. **UUIDv7 Primary Keys:** Primary keys use globally unique, time-ordered UUIDv7 identifiers instead of sequential auto-increment integers (`1, 2, 3`), eliminating sequential scanning attacks.
2. **Explicit Ownership Verification:** Repositories enforce ownership at the query level:
   ```java
   // Secure: Scoped to authenticated user ID
   @Query("SELECT o FROM Order o WHERE o.id = :orderId AND o.user.id = :userId")
   Optional<Order> findByIdAndUserId(UUID orderId, UUID userId);
   ```
3. **Spring Method Security:** Endpoints utilize declarative Spring Security `@PreAuthorize` rules:
   ```java
   @PreAuthorize("hasRole('PLATFORM_ADMIN') or @orgSecurity.isMember(authentication, #orgId, 'EVENT_MANAGER')")
   @PutMapping("/organizations/{orgId}/events/{eventId}")
   public ApiResponse<EventDto> updateEvent(...)
   ```

---

## 4. Payment Gateway Security & PCI-DSS Compliance

### 4.1 Zero Cardholder Data Footprint (SAQ-A)
- **Zero Card Storage:** EventPulse servers **NEVER** receive, process, or store raw Primary Account Numbers (PAN), CVVs, or card expiration dates.
- Payments use hosted elements / client-side gateway SDKs (Stripe Elements / Razorpay Checkout). The client sends credit card details directly to the PCI-DSS certified gateway, receiving a tokenized `payment_method_id` or `payment_intent_id`.
- The EventPulse backend only interacts with tokenized payment intents and settlement status.

### 4.2 Webhook Signature Verification
- Inbound webhooks from payment gateways are rejected unless their cryptographic signatures match the secret shared key:
  ```java
  // Stripe HMAC Signature Verification Example
  Event event = Webhook.constructEvent(
      payload, sigHeader, endpointSecret
  );
  ```
- Webhook endpoints enforce strict replay prevention: webhook transaction IDs are recorded in `payments` and duplicate deliveries return `200 OK` without re-executing business transactions.

---

## 5. Cryptographic Digital Ticket Security (Asymmetric Key Architecture)

### 5.1 Anti-Counterfeiting & Asymmetric Signing
Tickets are minted with a digitally signed compact string preventing visual forgery and scanner credential abuse:
```
Base64Url(Header) + "." + Base64Url(Claims) + "." + Base64Url(Sign_ECDSA_P256(Header.Claims, PrivateKey))
```
- **Asymmetric Trust Boundary:** The backend server holds the private signing key ($K_{\text{private}}$). Field gate scanners only receive the public verification key ($K_{\text{public}}$). Even if a mobile scanner device is lost, stolen, or decompiled on-site, attackers obtain only the public verification key and cannot mint counterfeit tickets.
- **Key Rotation & Versioning:** Every ticket header embeds a `kid` (Key ID), allowing rapid key rotation and per-event cryptographic isolation.
- **Nonce & Replay Prevention:** Each ticket has a unique nonce (`jti`). Once scanned at a gate, the database atomically marks the ticket as `USED`. Subsequent scans fail immediately with `ALREADY_USED`.
- **Zero PII Exposure:** The QR code does not contain customer names, phone numbers, or credit card info. Even if photographed by a bystander, no identity data is leaked.

---

## 6. Input Sanitization, Injection Prevention & Headers

### 6.1 SQL & NoSQL Injection
- All database interactions use Spring Data JPA / Hibernate parameterized queries with zero dynamic string concatenation.
- High-risk operations use strongly typed Criteria APIs or prepared statements.

### 6.2 Cross-Site Scripting (XSS) & Content Security
- Spring Security enforces modern HTTP response security headers:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Referrer-Policy: strict-origin-when-cross-origin
  ```
- Rich text fields (such as event descriptions) are sanitized server-side using HTML sanitization libraries before persistence.

---

## 7. Audit Logging & Immutable Operational Trail

All sensitive domain events trigger an immutable entry in the `audit_logs` table:
- **Logged Events:** Price modifications, capacity adjustments, ticket quota updates, manual refunds, role promotions, and event cancellations.
- **Payload:** Actor ID, role, client IP address, action code, timestamp, and a JSON snapshot of previous state vs. new state.
- **Tamper Evidence:** Audit log records are append-only; update and delete operations are restricted via database user permissions.

---

## 8. Secrets Management & Environment Hygiene

- **Rule 1:** Zero secrets in version control. No database passwords, JWT signing keys, or gateway API tokens are hardcoded.
- **Rule 2:** All secrets are resolved via environment variables (`DATABASE_PASSWORD`, `JWT_SECRET`, `STRIPE_API_KEY`).
- **Rule 3:** A sanitized template `.env.example` is provided in the repository root for developer onboarding.
