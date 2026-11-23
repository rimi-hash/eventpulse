package com.eventpulse;

import com.eventpulse.auth.dto.AuthResponse;
import com.eventpulse.auth.dto.LoginRequest;
import com.eventpulse.checkin.dto.CheckinResultDto;
import com.eventpulse.checkin.dto.ValidateTicketRequest;
import com.eventpulse.checkin.model.CheckinScanResult;
import com.eventpulse.checkin.service.CheckinService;
import com.eventpulse.common.api.ApiResponse;
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
import com.eventpulse.payments.dto.ConfirmPaymentRequest;
import com.eventpulse.payments.dto.PaymentIntentRequest;
import com.eventpulse.payments.dto.PaymentIntentResponse;
import com.eventpulse.payments.dto.PaymentResponseDto;
import com.eventpulse.payments.model.PaymentStatus;
import com.eventpulse.payments.service.PaymentService;
import com.eventpulse.ticketing.dto.TicketDto;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.ticketing.service.TicketService;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class EventPulseIntegrationTest {

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
    private TicketService ticketService;

    @Autowired
    private CheckinService checkinService;

    @Autowired
    private TicketRepository ticketRepository;

    @Test
    @DisplayName("Pre-seeded demo users exist and have correct roles")
    void testPreSeededUsers() {
        assertTrue(userRepository.existsByEmail("priya@eventpulse.io"));
        assertTrue(userRepository.existsByEmail("vikram@events.com"));
        assertTrue(userRepository.existsByEmail("sarah@platform.com"));

        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        assertEquals(Role.CUSTOMER, priya.getRole());
        assertEquals("Priya Sharma", priya.getFullName());

        User vikram = userRepository.findByEmail("vikram@events.com").orElseThrow();
        assertEquals(Role.ORGANIZER, vikram.getRole());
    }

    @Test
    @DisplayName("Catalog search returns published events")
    void testEventDiscovery() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        assertFalse(featured.isEmpty(), "Featured events should not be empty");

        EventSummaryDto first = featured.get(0);
        assertNotNull(first.title());
        assertNotNull(first.slug());
        assertTrue(first.startingPrice().compareTo(BigDecimal.ZERO) > 0);

        EventDetailDto detail = eventService.getEventByIdOrSlug(first.slug());
        assertNotNull(detail);
        assertEquals(first.title(), detail.title());
        assertFalse(detail.sessions().isEmpty());
        assertFalse(detail.ticketTypes().isEmpty());
    }

    @Test
    @DisplayName("End-to-end booking flow: Hold -> Order -> Payment Success -> Ticket Issuance")
    @Transactional
    void testEndToEndBookingFlowSuccess() {
        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventSummaryDto eventSummary = featured.get(0);
        EventDetailDto event = eventService.getEventByIdOrSlug(eventSummary.slug());

        UUID sessionId = event.sessions().get(0).id();
        UUID ticketTypeId = event.ticketTypes().get(0).id();

        // 1. Create Hold
        CreateHoldRequest holdReq = new CreateHoldRequest(ticketTypeId, null, 1, 480);
        HoldResponseDto hold = inventoryService.createHold(sessionId, holdReq, priya.getId());
        assertNotNull(hold.holdSessionToken());
        assertTrue(hold.remainingSeconds() > 0);
        assertEquals(1, hold.heldSeats().size());

        // 2. Create Order
        CreateOrderRequest orderReq = new CreateOrderRequest(
                hold.holdSessionToken(),
                priya.getEmail(),
                priya.getPhoneNumber(),
                null
        );
        OrderResponseDto order = orderService.createOrder(orderReq, priya.getId(), "idemp-test-order-01");
        assertNotNull(order.id());
        assertEquals(OrderStatus.PAYMENT_PENDING, order.status());
        assertTrue(order.totalAmount().compareTo(BigDecimal.ZERO) > 0);

        // 3. Create Payment Intent
        PaymentIntentRequest intentReq = new PaymentIntentRequest(order.id(), null, "CARD");
        PaymentIntentResponse intent = paymentService.createIntent(intentReq, priya.getId(), "idemp-test-pay-01");
        assertNotNull(intent.paymentId());

        // 4. Confirm Payment (Success)
        ConfirmPaymentRequest confirmReq = new ConfirmPaymentRequest(intent.paymentId(), false, null);
        PaymentResponseDto paymentRes = paymentService.confirmPayment(confirmReq, priya.getId());
        assertEquals(PaymentStatus.SUCCESS, paymentRes.status());

        // 5. Verify Order is Confirmed
        OrderResponseDto confirmedOrder = orderService.getOrder(order.id(), priya.getId(), Role.CUSTOMER);
        assertEquals(OrderStatus.CONFIRMED, confirmedOrder.status());

        // 6. Verify Digital Tickets Issued
        List<TicketDto> userTickets = ticketService.getMyTickets(priya.getId());
        assertFalse(userTickets.isEmpty());
        TicketDto issuedTicket = userTickets.stream()
                .filter(t -> t.orderId().equals(order.id()))
                .findFirst()
                .orElseThrow();
        assertNotNull(issuedTicket.qrCryptographicPayload());
        assertTrue(issuedTicket.ticketNumber().startsWith("TKT-2027-"));
    }

    @Test
    @DisplayName("Payment failure cancels order and releases held inventory")
    @Transactional
    void testPaymentFailureReleasesInventory() {
        User priya = userRepository.findByEmail("priya@eventpulse.io").orElseThrow();
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto event = eventService.getEventByIdOrSlug(featured.get(0).slug());

        UUID sessionId = event.sessions().get(0).id();
        UUID ticketTypeId = event.ticketTypes().get(0).id();

        // 1. Hold
        HoldResponseDto hold = inventoryService.createHold(sessionId, new CreateHoldRequest(ticketTypeId, null, 1, 480), priya.getId());

        // 2. Order
        OrderResponseDto order = orderService.createOrder(
                new CreateOrderRequest(hold.holdSessionToken(), priya.getEmail(), "+919876543210", null),
                priya.getId(),
                "idemp-fail-order-01"
        );

        // 3. Payment Intent
        PaymentIntentResponse intent = paymentService.createIntent(new PaymentIntentRequest(order.id(), null, "CARD"), priya.getId(), "idemp-fail-pay-01");

        // 4. Confirm with simulated decline
        ConfirmPaymentRequest confirmReq = new ConfirmPaymentRequest(intent.paymentId(), true, "Insufficient funds");
        PaymentResponseDto paymentRes = paymentService.confirmPayment(confirmReq, priya.getId());
        assertEquals(PaymentStatus.FAILED, paymentRes.status());

        // 5. Order is cancelled
        OrderResponseDto updatedOrder = orderService.getOrder(order.id(), priya.getId(), Role.CUSTOMER);
        assertEquals(OrderStatus.CANCELLED, updatedOrder.status());
    }

    @Test
    @DisplayName("Gate check-in detects valid entry and prevents duplicate redemption")
    @Transactional
    void testGateCheckinDuplicatePrevention() {
        User vikram = userRepository.findByEmail("vikram@events.com").orElseThrow();

        // Retrieve pre-seeded ticket for Priya
        List<Ticket> allTickets = ticketRepository.findAll();
        assertFalse(allTickets.isEmpty());
        Ticket testTicket = allTickets.get(0);

        // 1. First Scan -> VALID
        ValidateTicketRequest scan1 = new ValidateTicketRequest(testTicket.getTicketNumber(), "North Gate", "Scanner-01");
        CheckinResultDto res1 = checkinService.validateTicket(scan1, vikram.getId());
        assertEquals(CheckinScanResult.VALID, res1.scanResult());
        assertNotNull(res1.ticketNumber());

        // 2. Second Scan of same ticket -> ALREADY_USED
        ValidateTicketRequest scan2 = new ValidateTicketRequest(testTicket.getTicketNumber(), "North Gate", "Scanner-02");
        CheckinResultDto res2 = checkinService.validateTicket(scan2, vikram.getId());
        assertEquals(CheckinScanResult.ALREADY_USED, res2.scanResult());
        assertNotNull(res2.firstScanDetails());
        assertEquals("North Gate", res2.firstScanDetails().gateName());
    }
}
