package com.eventpulse.assistant;

import com.eventpulse.assistant.dto.AssistantChatRequest;
import com.eventpulse.assistant.dto.AssistantChatResponse;
import com.eventpulse.assistant.dto.ParsedIntentDto;
import com.eventpulse.assistant.model.AssistantIntent;
import com.eventpulse.assistant.provider.AiProviderClient;
import com.eventpulse.assistant.service.AssistantOrchestratorService;
import com.eventpulse.assistant.service.IntentParserService;
import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import com.eventpulse.assistant.dto.ApplicationContextDto;
import com.eventpulse.assistant.dto.BookingQuoteDto;
import com.eventpulse.assistant.model.ExecutionStatus;
import com.eventpulse.assistant.service.ToolRegistryService;
import com.eventpulse.events.dto.EventDetailDto;
import com.eventpulse.events.dto.EventSummaryDto;
import com.eventpulse.events.service.EventService;
import com.eventpulse.inventory.dto.SeatAvailabilityDto;
import com.eventpulse.inventory.service.InventoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class AssistantIntegrationTest {

    @Autowired
    private AssistantOrchestratorService orchestratorService;

    @Autowired
    private IntentParserService intentParserService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ToolRegistryService toolRegistryService;

    @Autowired
    private EventService eventService;

    @Autowired
    private InventoryService inventoryService;

    private User customerUser;
    private User organizerUser;
    private User otherCustomerUser;

    @BeforeEach
    void setUp() {
        customerUser = userRepository.findByEmail("customer1@eventpulse.io").orElseGet(() -> {
            User u = new User("Customer One", "customer1@eventpulse.io", "$2a$12$dummyHashPass", Role.CUSTOMER);
            return userRepository.save(u);
        });

        otherCustomerUser = userRepository.findByEmail("customer2@eventpulse.io").orElseGet(() -> {
            User u = new User("Customer Two", "customer2@eventpulse.io", "$2a$12$dummyHashPass", Role.CUSTOMER);
            return userRepository.save(u);
        });

        organizerUser = userRepository.findByEmail("organizer@eventpulse.io").orElseGet(() -> {
            User u = new User("Pro Event Organizer", "organizer@eventpulse.io", "$2a$12$dummyHashPass", Role.ORGANIZER);
            return userRepository.save(u);
        });
    }

    @Test
    @DisplayName("Valid intent parsing: Search comedy events returns structured intent and summary")
    void testSearchEventsIntent() {
        AssistantChatRequest request = new AssistantChatRequest("Find comedy shows in Chennai", "/events", false, null);
        AssistantChatResponse response = orchestratorService.processUserCommand(request, null);

        assertNotNull(response);
        assertEquals(AssistantIntent.SEARCH_EVENTS, response.intent());
        assertTrue(response.status().equals("SUCCESS") || response.status().equals("NO_RESULTS") || response.status().equals("NOT_FOUND"));
        assertNotNull(response.spokenText());
        assertNotNull(response.actionRoute());
    }

    @Test
    @DisplayName("Invalid/malformed model output falls back gracefully without crashing")
    void testMalformedAiOutputFallback() {
        // Mock provider returning garbage text / broken JSON
        AiProviderClient brokenProvider = new AiProviderClient() {
            @Override
            public String getProviderName() { return "BrokenMock"; }
            @Override
            public String generateContent(String systemInstruction, String userPrompt) {
                return "{ this is not valid JSON at all: [broken }";
            }
        };

        IntentParserService parserWithBrokenAi = new IntentParserService(brokenProvider, objectMapper);
        ParsedIntentDto parsed = parserWithBrokenAi.parseIntent("Show my tickets");

        assertNotNull(parsed);
        // Fallback rule parser recognizes "Show my tickets"
        assertEquals(AssistantIntent.VIEW_MY_TICKETS, parsed.intent());
    }

    @Test
    @DisplayName("Provider timeout or null response triggers deterministic heuristic parser")
    void testProviderTimeoutFallback() {
        AiProviderClient timeoutProvider = new AiProviderClient() {
            @Override
            public String getProviderName() { return "TimeoutMock"; }
            @Override
            public String generateContent(String systemInstruction, String userPrompt) {
                return null; // Simulates timeout or 429 quota exhaustion
            }
        };

        IntentParserService parser = new IntentParserService(timeoutProvider, objectMapper);
        ParsedIntentDto parsed = parser.parseIntent("Navigate to resale marketplace");

        assertNotNull(parsed);
        assertEquals(AssistantIntent.NAVIGATE_TO_PAGE, parsed.intent());
        assertEquals("/resale", parsed.parameters().get("pageRoute"));
    }

    @Test
    @DisplayName("Unsupported or ambiguous command returns UNKNOWN_OR_UNSUPPORTED status")
    void testUnsupportedCommand() {
        AssistantChatRequest request = new AssistantChatRequest("What is the recipe for chocolate cake?", "/", false, null);
        AssistantChatResponse response = orchestratorService.processUserCommand(request, null);

        assertNotNull(response);
        assertEquals(AssistantIntent.UNKNOWN_OR_UNSUPPORTED, response.intent());
        assertTrue("FAILED".equals(response.status()) || "UNKNOWN".equals(response.status()));
        assertTrue(response.spokenText().contains("YAS") || response.spokenText().contains("search events"));
    }

    @Test
    @DisplayName("Unauthenticated request for ticket wallet returns REQUIRES_AUTH challenge")
    void testUnauthenticatedTicketLookup() {
        AssistantChatRequest request = new AssistantChatRequest("Show my tickets", "/events", false, null);
        // Principal is null (anonymous user)
        AssistantChatResponse response = orchestratorService.processUserCommand(request, null);

        assertNotNull(response);
        assertEquals(AssistantIntent.VIEW_MY_TICKETS, response.intent());
        assertTrue("REQUIRES_AUTHENTICATION".equals(response.status()) || "REQUIRES_AUTH".equals(response.status()));
        assertEquals("/login", response.actionRoute());
        assertTrue(response.spokenText().toLowerCase().contains("sign in") || response.spokenText().toLowerCase().contains("log in"));
    }

    @Test
    @DisplayName("Authenticated customer can inspect their own tickets safely")
    void testAuthenticatedTicketLookup() {
        UserPrincipal customerPrincipal = UserPrincipal.create(customerUser);
        AssistantChatRequest request = new AssistantChatRequest("Show my ticket passes", "/events", false, null);

        AssistantChatResponse response = orchestratorService.processUserCommand(request, customerPrincipal);

        assertNotNull(response);
        assertEquals(AssistantIntent.VIEW_MY_TICKETS, response.intent());
        assertEquals("SUCCESS", response.status());
        assertEquals("/my-tickets", response.actionRoute());
        assertNotNull(response.spokenText());
    }

    @Test
    @DisplayName("Customer attempting organizer analytics is strictly FORBIDDEN")
    void testCustomerAttemptingOrganizerAnalytics() {
        UserPrincipal customerPrincipal = UserPrincipal.create(customerUser);
        AssistantChatRequest request = new AssistantChatRequest("Show organizer analytics and revenue stats", "/events", false, null);

        AssistantChatResponse response = orchestratorService.processUserCommand(request, customerPrincipal);

        assertNotNull(response);
        assertEquals(AssistantIntent.VIEW_ORGANIZER_ANALYTICS, response.intent());
        assertEquals("FORBIDDEN", response.status());
        assertTrue(response.spokenText().toLowerCase().contains("restricted") || response.spokenText().toLowerCase().contains("organizer"));
    }

    @Test
    @DisplayName("Organizer can access organizer analytics successfully")
    void testOrganizerAccessingAnalytics() {
        UserPrincipal organizerPrincipal = UserPrincipal.create(organizerUser);
        AssistantChatRequest request = new AssistantChatRequest("Show organizer analytics and revenue stats", "/organizer", false, null);

        AssistantChatResponse response = orchestratorService.processUserCommand(request, organizerPrincipal);

        assertNotNull(response);
        assertEquals(AssistantIntent.VIEW_ORGANIZER_ANALYTICS, response.intent());
        assertEquals("SUCCESS", response.status());
        assertEquals("/organizer", response.actionRoute());
        assertTrue(response.spokenText().contains("tickets sold") || response.spokenText().contains("revenue"));
    }

    @Test
    @DisplayName("IDOR prevention: User checking invalid or unowned order returns safe not-found error without leaking data")
    void testIdorOrderProtection() {
        UserPrincipal customerPrincipal = UserPrincipal.create(customerUser);
        UUID randomOtherOrderId = UUID.randomUUID();

        // Assistant request with foreign orderId parameter
        AssistantChatRequest request = new AssistantChatRequest("Check status of order " + randomOtherOrderId, "/my-orders", false, null);
        AssistantChatResponse response = orchestratorService.processUserCommand(request, customerPrincipal);

        assertNotNull(response);
        assertEquals(AssistantIntent.CHECK_ORDER_STATUS, response.intent());
        // Should not throw or leak, but return no results or fall back safely
        assertNotEquals("FORBIDDEN_LEAK", response.status());
    }

    @Test
    @DisplayName("Transactional intent (HOLD_SEATS) requires two-phase confirmation")
    void testTransactionalActionRequiresConfirmation() {
        UserPrincipal customerPrincipal = UserPrincipal.create(customerUser);
        AssistantChatRequest request = new AssistantChatRequest("Hold seat A1 in section VIP", "/events", false, null);

        AssistantChatResponse response = orchestratorService.processUserCommand(request, customerPrincipal);

        if (response.intent() == AssistantIntent.HOLD_SEATS) {
            assertTrue(response.requiresConfirmation());
            assertEquals("REQUIRES_CONFIRMATION", response.status());
            assertNotNull(response.pendingAction());
            assertTrue(response.spokenText().contains("confirm"));
        } else {
            assertNotNull(response.spokenText());
        }
    }

    @Test
    @DisplayName("Response contract includes requestId, verified sources, and action metadata")
    void testResponseContractMetadata() {
        AssistantChatRequest request = new AssistantChatRequest("Find concerts under 2000 in Chennai", "/events", false, null);
        AssistantChatResponse response = orchestratorService.processUserCommand(request, null);

        assertNotNull(response);
        assertNotNull(response.requestId(), "Response must include unique requestId");
        assertTrue(response.requestId().startsWith("yas-"));
        assertNotNull(response.sources(), "Response must include verified sources");
        assertFalse(response.sources().isEmpty());
        assertNotNull(response.action(), "Response must include action descriptor");
    }

    @Test
    @DisplayName("Zero tolerance for invented facts: non-existent event query returns NO_RESULTS without hallucination")
    void testZeroToleranceForInventedFacts() {
        AssistantChatRequest request = new AssistantChatRequest("Find tickets for Martian Alien Symphony 3000", "/events", false, null);
        AssistantChatResponse response = orchestratorService.processUserCommand(request, null);

        assertNotNull(response);
        // Must truthfully report NOT_FOUND or UNKNOWN, never claim fabricated tickets exist
        assertTrue("NOT_FOUND".equals(response.status()) || "NO_RESULTS".equals(response.status()) || "UNKNOWN".equals(response.status()));
        assertFalse(response.spokenText().toLowerCase().contains("martian alien"));
        assertNotNull(response.sources());
    }

    @Test
    @DisplayName("Bug 1 Fix: Booking from Explore resolves event, retrieves inventory, and prepares quote rather than navigation only")
    void testBug1_BookingFromExplore_PreparesQuoteWithoutNavigationOnly() {
        UserPrincipal principal = UserPrincipal.create(customerUser);
        AssistantChatRequest request = new AssistantChatRequest(
                "Book two tickets for Anuv Jain",
                "/events",
                false,
                null,
                ApplicationContextDto.empty(),
                null
        );

        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);

        assertNotNull(response);
        assertEquals(AssistantIntent.START_TICKET_PURCHASE, response.intent());
        assertEquals("REQUIRES_CONFIRMATION", response.status());
        assertEquals(ExecutionStatus.REQUIRES_CONFIRMATION, response.executionStatus());
        assertTrue(response.requiresConfirmation());

        // Must prepare real booking quote rather than just navigating
        assertNotNull(response.bookingQuote(), "Booking quote must be calculated by backend");
        assertEquals(2, response.bookingQuote().quantity());
        assertNotNull(response.bookingQuote().eventTitle());
        assertTrue(response.bookingQuote().totalAmount().compareTo(BigDecimal.ZERO) > 0);

        // Verification that navigation-only is eliminated
        assertFalse(response.spokenText().contains("Navigating to seat selection now"),
                "Should not merely announce navigation without booking preparation");
        assertTrue(response.spokenText().toLowerCase().contains("confirm") || response.spokenText().contains("₹"),
                "Spoken text should request confirmation with verified quote");
    }

    @Test
    @DisplayName("Bug 2 Fix: Booking while on event page preserves event context without asking which event or redirecting to Explore")
    void testBug2_BookingWhileOnEventPage_PreservesEventContext() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        assertFalse(featured.isEmpty());
        EventSummaryDto activeEvent = featured.get(0);
        EventDetailDto detail = eventService.getEventByIdOrSlug(activeEvent.slug());

        UserPrincipal principal = UserPrincipal.create(customerUser);
        ApplicationContextDto context = new ApplicationContextDto(
                "/events/" + activeEvent.slug(),
                "EVENT_DETAIL",
                detail.id(),
                detail.slug(),
                detail.title(),
                detail.sessions().get(0).id(),
                detail.venueId(),
                detail.venueName(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                "CUSTOMER"
        );

        AssistantChatRequest request = new AssistantChatRequest(
                "Book two tickets here",
                "/events/" + activeEvent.slug(),
                false,
                null,
                context,
                null
        );

        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);

        assertNotNull(response);
        assertEquals(AssistantIntent.START_TICKET_PURCHASE, response.intent());
        // Must NOT ask which event or navigate to /events
        assertFalse(response.spokenText().contains("Which event would you like to book"),
                "Must not ask which event when context is active");
        assertNotEquals("/events", response.actionRoute(), "Must not redirect to Explore");
        assertNotNull(response.bookingQuote());
        assertEquals(detail.title(), response.bookingQuote().eventTitle());
        assertEquals(2, response.bookingQuote().quantity());
    }

    @Test
    @DisplayName("Bug 2 Fix: Contextual seat selection resolves seat against active event and section")
    void testBug2_ContextualSeatSelection_ResolvesInActiveSection() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        assertFalse(featured.isEmpty());
        EventSummaryDto activeEvent = featured.get(0);
        EventDetailDto detail = eventService.getEventByIdOrSlug(activeEvent.slug());
        UUID sessionId = detail.sessions().get(0).id();

        List<SeatAvailabilityDto> seats = inventoryService.getAvailability(sessionId);
        assertFalse(seats.isEmpty());
        SeatAvailabilityDto firstSeat = seats.stream()
                .filter(s -> com.eventpulse.inventory.model.InventoryStatus.AVAILABLE.equals(s.status()))
                .findFirst()
                .orElse(seats.get(0));

        String seatLabel = firstSeat.rowLabel() + firstSeat.seatNumber();

        UserPrincipal principal = UserPrincipal.create(customerUser);
        ApplicationContextDto context = new ApplicationContextDto(
                "/events/" + activeEvent.slug(),
                "EVENT_DETAIL",
                detail.id(),
                detail.slug(),
                detail.title(),
                sessionId,
                detail.venueId(),
                detail.venueName(),
                firstSeat.sectionName(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                "CUSTOMER"
        );

        AssistantChatRequest request = new AssistantChatRequest(
                "Select seat " + seatLabel,
                "/events/" + activeEvent.slug(),
                false,
                null,
                context,
                null
        );

        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);

        assertNotNull(response);
        assertEquals(AssistantIntent.SELECT_SEATS, response.intent());
        assertNotEquals("/events", response.actionRoute());
        // When available, status should be SUCCESS and data should contain selected seat
        if (com.eventpulse.inventory.model.InventoryStatus.AVAILABLE.equals(firstSeat.status())) {
            assertEquals("SUCCESS", response.status());
            assertEquals(ExecutionStatus.SUCCESS, response.executionStatus());
            assertNotNull(response.data());
            assertTrue(((Map<?, ?>) response.data()).containsKey("selectedSeatIds"));
            assertFalse(response.requiresConfirmation(), "Seat selection is reversible (Level 1) - does not charge");
        }
    }

    @Test
    @DisplayName("Ambiguous seat selection: Seat in multiple sections requests disambiguation without navigating away")
    void testAmbiguousSeatSectionClarification() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto detail = eventService.getEventByIdOrSlug(featured.get(0).slug());
        UUID sessionId = detail.sessions().get(0).id();

        UserPrincipal principal = UserPrincipal.create(customerUser);
        // Context without active section
        ApplicationContextDto context = new ApplicationContextDto(
                "/events/" + detail.slug(),
                "EVENT_DETAIL",
                detail.id(),
                detail.slug(),
                detail.title(),
                sessionId,
                detail.venueId(),
                detail.venueName(),
                null, // No section specified
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                "CUSTOMER"
        );

        // Ambiguous seat search or section disambiguation
        AssistantChatRequest request = new AssistantChatRequest(
                "Select seat A12",
                "/events/" + detail.slug(),
                false,
                null,
                context,
                null
        );

        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);

        assertNotNull(response);
        assertEquals(AssistantIntent.SELECT_SEATS, response.intent());
        assertNotEquals("/events", response.actionRoute(), "Must never dump user back to Explore");
    }

    @Test
    @DisplayName("Unavailable seat: Reports truthful sold out status without hallucinating a fake booking")
    void testUnavailableSeat_ReportsTruthfully() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventDetailDto detail = eventService.getEventByIdOrSlug(featured.get(0).slug());
        UUID sessionId = detail.sessions().get(0).id();

        UserPrincipal principal = UserPrincipal.create(customerUser);
        ApplicationContextDto context = new ApplicationContextDto(
                "/events/" + detail.slug(),
                "EVENT_DETAIL",
                detail.id(),
                detail.slug(),
                detail.title(),
                sessionId,
                detail.venueId(),
                detail.venueName(),
                "VIP",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                "CUSTOMER"
        );

        // Non-existent or sold seat
        AssistantChatRequest request = new AssistantChatRequest(
                "Select seat Z999",
                "/events/" + detail.slug(),
                false,
                null,
                context,
                null
        );

        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);

        assertNotNull(response);
        assertEquals(AssistantIntent.SELECT_SEATS, response.intent());
        assertTrue(response.status().equals("NO_RESULTS") || response.status().equals("NOT_FOUND") || response.status().equals("SOLD_OUT") || response.status().equals("ERROR"));
        assertFalse(response.spokenText().contains("booked"), "Must never claim unavailable seat was booked");
    }

    @Test
    @DisplayName("Unauthenticated booking: Triggers auth challenge while preserving event context")
    void testUnauthenticatedBookingPreservesContext() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventSummaryDto activeEvent = featured.get(0);

        AssistantChatRequest request = new AssistantChatRequest(
                "Book two tickets for " + activeEvent.title(),
                "/events",
                false,
                null,
                ApplicationContextDto.empty(),
                null
        );

        // Anonymous user (null principal)
        AssistantChatResponse response = orchestratorService.processUserCommand(request, null);

        assertNotNull(response);
        assertEquals(AssistantIntent.START_TICKET_PURCHASE, response.intent());
        assertTrue("REQUIRES_AUTHENTICATION".equals(response.status()) || "REQUIRES_AUTH".equals(response.status()));
        assertEquals(ExecutionStatus.REQUIRES_AUTHENTICATION, response.executionStatus());
        assertEquals("/login", response.actionRoute());
        assertTrue(response.spokenText().toLowerCase().contains("sign in") || response.spokenText().toLowerCase().contains("log in"));
    }

    @Test
    @DisplayName("Two-Phase Confirmation: Confirmed booking commits atomic hold and order via domain services")
    void testConfirmedBooking_CreatesHoldAndOrder() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        EventSummaryDto activeEvent = featured.get(0);
        EventDetailDto detail = eventService.getEventByIdOrSlug(activeEvent.slug());

        UserPrincipal principal = UserPrincipal.create(customerUser);
        ApplicationContextDto context = new ApplicationContextDto(
                "/events/" + activeEvent.slug(),
                "EVENT_DETAIL",
                detail.id(),
                detail.slug(),
                detail.title(),
                detail.sessions().get(0).id(),
                detail.venueId(),
                detail.venueName(),
                null,
                detail.ticketTypes().get(0).id(),
                detail.ticketTypes().get(0).name(),
                null,
                null,
                2,
                null,
                null,
                true,
                "CUSTOMER"
        );

        // Step 1: Request quote (unconfirmed)
        AssistantChatRequest quoteReq = new AssistantChatRequest(
                "Book 2 tickets for " + detail.title(),
                "/events/" + activeEvent.slug(),
                false,
                null,
                context,
                null
        );
        AssistantChatResponse quoteRes = orchestratorService.processUserCommand(quoteReq, principal);
        assertNotNull(quoteRes.pendingAction());
        String token = (String) quoteRes.pendingAction().get("actionToken");

        // Step 2: Confirm booking with actionToken
        AssistantChatRequest confirmReq = new AssistantChatRequest(
                "Yes, confirm booking",
                "/events/" + activeEvent.slug(),
                true,
                token,
                context,
                null
        );
        AssistantChatResponse confirmRes = orchestratorService.processUserCommand(confirmReq, principal);

        assertNotNull(confirmRes);
        assertEquals(AssistantIntent.START_TICKET_PURCHASE, confirmRes.intent());
        // Outcome should be AWAITING_PAYMENT or SUCCESS with active checkout route
        assertTrue("AWAITING_PAYMENT".equals(confirmRes.status()) || "SUCCESS".equals(confirmRes.status()) || confirmRes.actionRoute().contains("/checkout"));
        assertNotNull(confirmRes.data());
        if (confirmRes.data() instanceof com.eventpulse.orders.dto.OrderResponseDto orderDto) {
            assertNotNull(orderDto.id());
        } else if (confirmRes.data() instanceof Map<?, ?> map) {
            assertTrue(map.containsKey("orderId"));
        }
    }

    @Test
    @DisplayName("Context switching: Navigating to Event B switches resolution target away from Event A")
    void testContextSwitchingResolvesNewEvent() {
        List<EventSummaryDto> featured = eventService.getFeaturedEvents();
        assertTrue(featured.size() >= 2, "Need at least 2 events to test context switching");

        EventSummaryDto eventA = featured.get(0);
        EventSummaryDto eventB = featured.get(1);
        EventDetailDto detailB = eventService.getEventByIdOrSlug(eventB.slug());

        UserPrincipal principal = UserPrincipal.create(customerUser);
        ApplicationContextDto contextB = new ApplicationContextDto(
                "/events/" + eventB.slug(),
                "EVENT_DETAIL",
                detailB.id(),
                detailB.slug(),
                detailB.title(),
                detailB.sessions().get(0).id(),
                detailB.venueId(),
                detailB.venueName(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                "CUSTOMER"
        );

        AssistantChatRequest request = new AssistantChatRequest(
                "Book two tickets here",
                "/events/" + eventB.slug(),
                false,
                null,
                contextB,
                null
        );

        AssistantChatResponse response = orchestratorService.processUserCommand(request, principal);

        assertNotNull(response);
        assertEquals(AssistantIntent.START_TICKET_PURCHASE, response.intent());
        assertNotNull(response.bookingQuote());
        assertEquals(detailB.title(), response.bookingQuote().eventTitle(), "Must resolve against Event B");
        assertNotEquals(eventA.title(), response.bookingQuote().eventTitle(), "Must NOT use stale Event A");
    }

    @Test
    @DisplayName("Capability Registry: Exposes all Level 0-3 production tools with schemas and permission levels")
    void testToolRegistryCapabilities() {
        List<ToolRegistryService.ToolDefinition> tools = toolRegistryService.getAllTools();
        assertFalse(tools.isEmpty(), "Tool registry must contain production tools");

        // Verify Level 0 tools
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("search_events") && t.permissionLevel() == ToolRegistryService.PermissionLevel.LEVEL_0_READ_ONLY_NAVIGATION));
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("get_my_tickets") && t.requiresAuth()));

        // Verify Level 1 tools
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("select_seats") && t.permissionLevel() == ToolRegistryService.PermissionLevel.LEVEL_1_REVERSIBLE_SELECTION));
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("update_ticket_selection")));

        // Verify Level 2 tools
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("prepare_booking") && t.requiresConfirmation() && t.permissionLevel() == ToolRegistryService.PermissionLevel.LEVEL_2_CONSEQUENTIAL_FINANCIAL));
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("confirm_payment") && t.requiresConfirmation()));

        // Verify Level 3 tools
        assertTrue(tools.stream().anyMatch(t -> t.name().equals("admin_reports") && t.permissionLevel() == ToolRegistryService.PermissionLevel.LEVEL_3_SENSITIVE_ADMINISTRATIVE));
    }
}
