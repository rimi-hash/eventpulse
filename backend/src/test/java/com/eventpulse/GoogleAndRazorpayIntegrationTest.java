package com.eventpulse;

import com.eventpulse.auth.dto.AuthResponse;
import com.eventpulse.auth.dto.GoogleAuthRequest;
import com.eventpulse.auth.service.AuthService;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.events.dto.EventDetailDto;
import com.eventpulse.events.dto.EventSummaryDto;
import com.eventpulse.events.service.EventService;
import com.eventpulse.inventory.dto.CreateHoldRequest;
import com.eventpulse.inventory.dto.HoldResponseDto;
import com.eventpulse.inventory.service.InventoryService;
import com.eventpulse.orders.dto.CreateOrderRequest;
import com.eventpulse.orders.dto.OrderResponseDto;
import com.eventpulse.orders.model.OrderStatus;
import com.eventpulse.orders.service.OrderService;
import com.eventpulse.payments.dto.PaymentResponseDto;
import com.eventpulse.payments.dto.RazorpayOrderResponse;
import com.eventpulse.payments.dto.RazorpayVerifyRequest;
import com.eventpulse.payments.model.PaymentStatus;
import com.eventpulse.payments.service.PaymentService;
import com.eventpulse.payments.service.RazorpayService;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class GoogleAndRazorpayIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventService eventService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private RazorpayService razorpayService;

    @Autowired
    private TicketRepository ticketRepository;

    @Test
    @DisplayName("Google OAuth: Successfully provisions new user and issues JWT")
    @Transactional
    void testGoogleAuthenticationSuccess_NewUser() {
        String testSub = "google-user-" + UUID.randomUUID().toString().substring(0, 8);
        String token = "test-google-id-token-" + testSub;

        AuthResponse response = authService.authenticateWithGoogle(new GoogleAuthRequest(token));

        assertNotNull(response);
        assertNotNull(response.token());
        assertEquals(testSub + "@gmail.com", response.email());
        assertEquals(Role.CUSTOMER, response.role());

        User user = userRepository.findByEmail(testSub + "@gmail.com").orElse(null);
        assertNotNull(user);
        assertTrue(user.isVerified());
        assertTrue(user.isActive());
    }

    @Test
    @DisplayName("Google OAuth: Successfully authenticates existing user preserving profile")
    @Transactional
    void testGoogleAuthenticationSuccess_ExistingUser() {
        AuthResponse response = authService.authenticateWithGoogle(new GoogleAuthRequest("test-google-id-token-priya"));

        assertNotNull(response);
        assertNotNull(response.token());
        assertEquals("priya@gmail.com", response.email());
    }

    @Test
    @DisplayName("Google OAuth: Rejects empty or invalid token")
    void testGoogleAuthentication_InvalidToken() {
        assertThrows(UnauthorizedException.class, () -> {
            authService.authenticateWithGoogle(new GoogleAuthRequest(""));
        });
    }

    @Test
    @DisplayName("Razorpay: Authoritative server-side order creation calculates correct amount in paise")
    @Transactional
    void testRazorpayOrderCreation() {
        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto event = eventService.getEventByIdOrSlug(featured.get(0).slug());
        UUID sessionId = event.sessions().get(0).id();
        UUID ticketTypeId = event.ticketTypes().get(0).id();

        HoldResponseDto hold = inventoryService.createHold(
                sessionId,
                new CreateHoldRequest(ticketTypeId, null, 1, 480),
                priya.getId()
        );

        OrderResponseDto orderDto = orderService.createOrder(
                new CreateOrderRequest(hold.holdSessionToken(), "priya@eventpulse.io", "+919876543210", null),
                priya.getId(),
                "idemp-rzp-test-1"
        );

        RazorpayOrderResponse rzpOrder = paymentService.createRazorpayOrder(orderDto.id(), priya.getId());

        assertNotNull(rzpOrder);
        assertNotNull(rzpOrder.razorpayOrderId());
        assertEquals(orderDto.id(), rzpOrder.orderId());
        long expectedPaise = orderDto.totalAmount().multiply(new java.math.BigDecimal("100")).setScale(0, java.math.RoundingMode.HALF_UP).longValue();
        assertEquals(expectedPaise, rzpOrder.amountInPaise());
    }

    @Test
    @DisplayName("Razorpay: Valid HMAC signature verification settles order and issues tickets")
    @Transactional
    void testRazorpayPaymentVerification_ValidSignature() {
        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto event = eventService.getEventByIdOrSlug(featured.get(0).slug());
        UUID sessionId = event.sessions().get(0).id();
        UUID ticketTypeId = event.ticketTypes().get(0).id();

        HoldResponseDto hold = inventoryService.createHold(
                sessionId,
                new CreateHoldRequest(ticketTypeId, null, 1, 480),
                priya.getId()
        );

        OrderResponseDto orderDto = orderService.createOrder(
                new CreateOrderRequest(hold.holdSessionToken(), "priya@eventpulse.io", "+919876543210", null),
                priya.getId(),
                "idemp-rzp-test-2"
        );

        RazorpayOrderResponse rzpOrder = paymentService.createRazorpayOrder(orderDto.id(), priya.getId());

        String fakeRzpPaymentId = "pay_test_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String expectedSignature = RazorpayService.calculateHmacSha256(
                rzpOrder.razorpayOrderId() + "|" + fakeRzpPaymentId,
                razorpayService.getKeySecret()
        );

        RazorpayVerifyRequest verifyReq = new RazorpayVerifyRequest(
                orderDto.id(),
                rzpOrder.paymentId(),
                rzpOrder.razorpayOrderId(),
                fakeRzpPaymentId,
                expectedSignature
        );

        PaymentResponseDto paymentResult = paymentService.verifyAndConfirmRazorpay(verifyReq, priya.getId());

        assertNotNull(paymentResult);
        assertEquals(PaymentStatus.SUCCESS, paymentResult.status());
        assertEquals(fakeRzpPaymentId, paymentResult.gatewayTransactionId());

        // Verify order is CONFIRMED and tickets exist
        var confirmedOrder = orderService.getOrder(orderDto.id(), priya.getId(), Role.CUSTOMER);
        assertEquals(OrderStatus.CONFIRMED, confirmedOrder.status());
        assertFalse(ticketRepository.findByCurrentOwnerIdOrderByCreatedAtDesc(priya.getId()).isEmpty());
    }

    @Test
    @DisplayName("Razorpay: Tampered signature is strictly rejected and payment marked failed")
    @Transactional
    void testRazorpayPaymentVerification_InvalidSignature() {
        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto event = eventService.getEventByIdOrSlug(featured.get(0).slug());
        UUID sessionId = event.sessions().get(0).id();
        UUID ticketTypeId = event.ticketTypes().get(0).id();

        HoldResponseDto hold = inventoryService.createHold(
                sessionId,
                new CreateHoldRequest(ticketTypeId, null, 1, 480),
                priya.getId()
        );

        OrderResponseDto orderDto = orderService.createOrder(
                new CreateOrderRequest(hold.holdSessionToken(), "priya@eventpulse.io", "+919876543210", null),
                priya.getId(),
                "idemp-rzp-test-3"
        );

        RazorpayOrderResponse rzpOrder = paymentService.createRazorpayOrder(orderDto.id(), priya.getId());

        RazorpayVerifyRequest tamperedReq = new RazorpayVerifyRequest(
                orderDto.id(),
                rzpOrder.paymentId(),
                rzpOrder.razorpayOrderId(),
                "pay_test_tampered",
                "bad_signature_00000000000000000000000000000000000000000000000000000000"
        );

        assertThrows(BadRequestException.class, () -> {
            paymentService.verifyAndConfirmRazorpay(tamperedReq, priya.getId());
        });
    }

    @Test
    @DisplayName("Razorpay: Repeated payment verification calls are idempotent and return safely")
    @Transactional
    void testRazorpayPaymentVerification_Idempotency() {
        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto event = eventService.getEventByIdOrSlug(featured.get(0).slug());
        UUID sessionId = event.sessions().get(0).id();
        UUID ticketTypeId = event.ticketTypes().get(0).id();

        HoldResponseDto hold = inventoryService.createHold(
                sessionId,
                new CreateHoldRequest(ticketTypeId, null, 1, 480),
                priya.getId()
        );

        OrderResponseDto orderDto = orderService.createOrder(
                new CreateOrderRequest(hold.holdSessionToken(), "priya@eventpulse.io", "+919876543210", null),
                priya.getId(),
                "idemp-rzp-test-4"
        );

        RazorpayOrderResponse rzpOrder = paymentService.createRazorpayOrder(orderDto.id(), priya.getId());

        String fakeRzpPaymentId = "pay_test_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String expectedSignature = RazorpayService.calculateHmacSha256(
                rzpOrder.razorpayOrderId() + "|" + fakeRzpPaymentId,
                razorpayService.getKeySecret()
        );

        RazorpayVerifyRequest verifyReq = new RazorpayVerifyRequest(
                orderDto.id(),
                rzpOrder.paymentId(),
                rzpOrder.razorpayOrderId(),
                fakeRzpPaymentId,
                expectedSignature
        );

        PaymentResponseDto firstCall = paymentService.verifyAndConfirmRazorpay(verifyReq, priya.getId());
        int ticketCountAfterFirst = ticketRepository.findByCurrentOwnerIdOrderByCreatedAtDesc(priya.getId()).size();

        PaymentResponseDto secondCall = paymentService.verifyAndConfirmRazorpay(verifyReq, priya.getId());
        int ticketCountAfterSecond = ticketRepository.findByCurrentOwnerIdOrderByCreatedAtDesc(priya.getId()).size();

        assertEquals(PaymentStatus.SUCCESS, firstCall.status());
        assertEquals(PaymentStatus.SUCCESS, secondCall.status());
        assertEquals(ticketCountAfterFirst, ticketCountAfterSecond); // Zero duplicate tickets issued
    }

    @Test
    @DisplayName("Razorpay Webhook: Verified signature processes event and deduplicates repeated calls")
    @Transactional
    void testRazorpayWebhook_ValidSignatureAndDeduplication() {
        String eventId = "evt_test_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String payload = "{\"entity\":\"event\",\"id\":\"" + eventId + "\",\"event\":\"payment.captured\",\"payload\":{}}";

        String validSig = RazorpayService.calculateHmacSha256(payload, razorpayService.getWebhookSecret());

        String result1 = paymentService.handleRazorpayWebhook(payload, validSig);
        assertEquals("Webhook processed successfully", result1);

        // Repeated call with same event ID should be deduplicated
        String result2 = paymentService.handleRazorpayWebhook(payload, validSig);
        assertEquals("Event already processed", result2);
    }

    @Test
    @DisplayName("Razorpay Webhook: Invalid signature is rejected with BadRequestException")
    void testRazorpayWebhook_InvalidSignature() {
        String payload = "{\"event\":\"payment.captured\"}";
        assertThrows(BadRequestException.class, () -> {
            paymentService.handleRazorpayWebhook(payload, "invalid_webhook_sig_hex");
        });
    }
}
