# EventPulse — Automated Testing & Quality Assurance Strategy

**Document Version:** 1.0.0  
**Testing Frameworks:** JUnit 5 · Mockito · AssertJ · Spring Boot Test · Testcontainers · Playwright  

---

## 1. Quality Assurance Philosophy & Testing Pyramid

EventPulse enforces a rigorous, multi-tiered testing strategy designed to validate core business invariants, especially around financial transactions, high-concurrency seat inventory allocation, and cryptographic admission.

```
                   /\
                  /  \   End-to-End & Playwright (Critical User Flows)
                 /────\
                /      \   High-Concurrency Stress & Race Condition Tests
               /────────\
              /          \   Integration Tests (Spring Context + DB + Redis)
             /────────────\
            /              \   Domain Service & State Machine Unit Tests
           /────────────────\
```

---

## 2. Test Classification & Coverage Targets

| Test Level | Scope | Execution Tool | Target Coverage |
|---|---|---|:---:|
| **Unit Tests** | Domain models, pricing calculations, state machine transitions, coupon rules, token signers. | JUnit 5 + Mockito | > 90% |
| **Repository Tests** | Custom JPA queries, optimistic locking annotations, native index queries. | `@DataJpaTest` | > 85% |
| **Controller Tests** | Request validation, HTTP status codes, RFC 7807 problem details serialization, RBAC permissions. | `@WebMvcTest` + MockMvc | > 85% |
| **Integration Tests** | Full Spring context, database transactions, Redis locks, payment gateway abstraction. | `@SpringBootTest` | > 80% |
| **Concurrency Tests**| Multi-threaded race conditions, distributed seat holds, idempotency under contention. | `ExecutorService` + `CountDownLatch` | 100% critical paths |
| **End-to-End Tests** | Browser-based user journeys: Discovery $\rightarrow$ Hold $\rightarrow$ Checkout $\rightarrow$ QR Scan. | Playwright / MockMvc | Key Journeys |

---

## 3. High-Concurrency & Race Condition Test Suite

### 3.1 The Double-Booking Invariant Test (`SeatHoldConcurrencyTest`)
The single most critical test in EventPulse validates that when $N$ concurrent users attempt to hold the exact same seat at the identical instant, **exactly one customer succeeds**, and all other $N-1$ users receive a clean `409 Conflict`.

### 3.2 Redis + Database Compensation & Failure Scenario Tests (`SeatHoldFailureMatrixTest`)
Validates transactional consistency across distributed boundaries:
1. **Scenario C (Redis Succeeds + DB Transaction Fails):** Simulates database constraint violation or transient failure after Redis lease is acquired. Proves the compensating transaction immediately releases the Redis hold key (zero phantom hold).
2. **Scenario A (Redis Down):** Proves fallback to PostgreSQL pessimistic lock (`SELECT ... FOR UPDATE NOWAIT`) prevents double allocation.
3. **Scenario E (Hold Expired During Checkout):** Proves orders fail with RFC 7807 `410 Gone / HOLD_EXPIRED`.

#### Concurrency Test Architecture:
```java
@SpringBootTest
public class SeatHoldConcurrencyTest {

    @Autowired
    private SeatInventoryService inventoryService;

    @Test
    @DisplayName("100 concurrent threads competing for 1 seat: Exactly 1 succeeds, 99 fail")
    public void testConcurrentSeatHoldInvariant() throws InterruptedException {
        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(threadCount);

        UUID targetSeatId = UUID.fromString("seat-section-a-row-1-seat-12");
        UUID eventSessionId = UUID.fromString("session-cbe-music-fest-2027");

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final UUID userId = UUID.randomUUID();
            executor.submit(() -> {
                try {
                    startSignal.await(); // Hold all threads until release
                    HoldResult result = inventoryService.holdSeats(
                        eventSessionId, 
                        List.of(targetSeatId), 
                        userId, 
                        480
                    );
                    if (result.isSuccess()) {
                        successCount.incrementAndGet();
                    }
                } catch (SeatAlreadyHeldException ex) {
                    conflictCount.incrementAndGet();
                } catch (Exception ex) {
                    // unexpected error
                } finally {
                    doneSignal.countDown();
                }
            });
        }

        startSignal.countDown(); // Launch all threads simultaneously
        doneSignal.await(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(99);
    }
}
```

---

## 4. Idempotency & Financial Safety Tests

### 4.1 Payment Idempotency Test
Validates that if a network stutter causes a client to submit duplicate payment requests with the same `Idempotency-Key`, the system processes the payment only once:
- **Scenario:** Client sends `POST /api/v1/orders` twice with `Idempotency-Key: abc-123`.
- **Assertion:**
  - Database contains exactly 1 order row for `abc-123`.
  - Second HTTP call returns cached `201 Created` with identical body.
  - Zero duplicate order items or double financial charges.

### 4.2 Webhook Deduplication Test
- **Scenario:** Payment gateway emits duplicate `payment_intent.succeeded` webhooks for transaction `pi_9871`.
- **Assertion:**
  - Order transitions to `CONFIRMED` on first webhook.
  - Second webhook acknowledges `200 OK` immediately.
  - Exactly one set of digital tickets is minted.

---

## 5. Seat Hold Expiration & Lifecycle Tests

### 5.1 TTL Expiration Worker Test
Validates the automatic release of abandoned seats:
1. User holds Seat A12 at $T_0$ with an 8-minute TTL.
2. Status transitions to `HELD`.
3. Test advances simulated clock past $T_0 + 8\text{ mins}$.
4. The hold cleanup scheduler runs:
   - State in `seat_inventory` resets to `AVAILABLE`.
   - Redis key `hold:event:...` is cleared.
   - User attempting checkout at $T_0 + 9\text{ mins}$ receives `410 Gone / Hold Expired`.
   - Another user can now immediately hold Seat A12.

---

## 6. Digital Ticket & Field Gate Check-in Tests

### 6.1 Gate Check-in Multi-Scan Test
- **Test 1 (Valid First Scan):** Scan issued ticket QR at Gate A $\rightarrow$ Returns `VALID`, attendee details, and gate timestamp.
- **Test 2 (Duplicate Scan Attack):** Scan same ticket QR 30 seconds later at Gate B $\rightarrow$ Returns `ALREADY_USED`, displays first scan timestamp and Gate A.
- **Test 3 (Tampered Payload):** Alter 1 character in the cryptographic QR payload $\rightarrow$ Signature validation fails, returns `INVALID_SIGNATURE`.
- **Test 4 (Wrong Gate):** VIP ticket presented at General Admission gate $\rightarrow$ Returns `WRONG_GATE` with redirection advice.

---

## 7. Continuous Integration (CI) Pipeline Checks

The GitHub Actions / GitLab CI pipeline enforces these quality gates on every commit:
1. **Compilation & Static Analysis:** SpotBugs / Checkstyle / ESLint checks (zero warnings).
2. **Unit & Slice Tests:** Run in under 60 seconds (`mvn test`).
3. **Integration & Concurrency Tests:** Run against Testcontainers PostgreSQL and Redis instances.
4. **Build Artifact Validation:** Multi-stage Docker build producing zero-vulnerability container image.
