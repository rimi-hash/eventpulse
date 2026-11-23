package com.eventpulse;

import com.eventpulse.auth.dto.LoginRequest;
import com.eventpulse.auth.dto.RegisterRequest;
import com.eventpulse.auth.service.AuthService;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.events.dto.EventDetailDto;
import com.eventpulse.events.model.Event;
import com.eventpulse.events.model.EventCategory;
import com.eventpulse.events.model.EventStatus;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.events.service.EventService;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.promotions.dto.CouponValidationResultDto;
import com.eventpulse.promotions.dto.CreateCouponRequest;
import com.eventpulse.promotions.dto.ValidateCouponRequest;
import com.eventpulse.promotions.model.DiscountType;
import com.eventpulse.promotions.service.CouponService;
import com.eventpulse.resale.dto.CreateResaleListingRequest;
import com.eventpulse.resale.dto.ResaleListingDto;
import com.eventpulse.resale.model.ResaleListingStatus;
import com.eventpulse.resale.service.ResaleService;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import com.eventpulse.venues.model.Venue;
import com.eventpulse.venues.repository.VenueRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class PlatformBusinessRulesIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventService eventService;

    @Autowired
    private CouponService couponService;

    @Autowired
    private ResaleService resaleService;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private com.eventpulse.analytics.service.CsvExportService csvExportService;

    @Test
    @DisplayName("Password policy: reject passwords shorter than 8 or longer than 12 characters, or missing letters/numbers/special characters")
    void testPasswordPolicyValidation() {
        // Too short (<8)
        assertThrows(BadRequestException.class, () -> {
            authService.register(new RegisterRequest(
                    "Test User", "testuser_short", "testshort@example.com", "Pass1!", null, null, true
            ));
        });

        // Too long (>12)
        assertThrows(BadRequestException.class, () -> {
            authService.register(new RegisterRequest(
                    "Test User", "testuser_long", "testlong@example.com", "Pass123456789!", null, null, true
            ));
        });

        // Missing numbers
        assertThrows(BadRequestException.class, () -> {
            authService.register(new RegisterRequest(
                    "Test User", "testuser_nonum", "testnonum@example.com", "PassWord!@#", null, null, true
            ));
        });

        // Missing letters
        assertThrows(BadRequestException.class, () -> {
            authService.register(new RegisterRequest(
                    "Test User", "testuser_noletters", "testnoletters@example.com", "123456789!", null, null, true
            ));
        });

        // Valid password (8-12 chars, letter, number and special char)
        var auth = authService.register(new RegisterRequest(
                "Valid User", "valid_user_2027", "validuser@example.com", "Secure123!", null, null, true
        ));
        assertNotNull(auth);
        assertEquals("valid_user_2027", auth.username());
        assertEquals(Role.CUSTOMER, auth.role()); // Ensures self-registration always assigns CUSTOMER
    }

    @Test
    @DisplayName("Authentication: support sign in via unique username as well as email")
    void testLoginWithUsername() {
        String username = "deepak_fan_" + UUID.randomUUID().toString().substring(0, 6);
        String email = username + "@eventpulse.test";
        String password = "Strong123!";

        authService.register(new RegisterRequest("Deepak Verma", username, email, password, null, null, true));

        // Sign in using username
        var loginByUsername = authService.login(new LoginRequest(username, password));
        assertNotNull(loginByUsername.token());
        assertEquals(username, loginByUsername.username());

        // Sign in using email
        var loginByEmail = authService.login(new LoginRequest(email, password));
        assertNotNull(loginByEmail.token());
        assertEquals(email, loginByEmail.email());
    }

    @Test
    @DisplayName("Organizer verification rule: unverified organizations cannot publish live events")
    void testOrganizerVerificationEnforcedOnPublish() {
        User unverifiedUser = userRepository.save(new User("unverified@org.com", "unverified_pass", "encoded", "Unverified Organizer", Role.ORGANIZER));
        Organization unverifiedOrg = new Organization("Unverified Promoter", "unverified-promo-" + UUID.randomUUID(), "unverified@org.com", unverifiedUser);
        unverifiedOrg.setVerificationStatus("PENDING");
        unverifiedOrg = organizationRepository.save(unverifiedOrg);

        Venue venue = venueRepository.findAll().get(0);

        Event draftEvent = new Event(unverifiedOrg, venue, "Unverified Show", "unverified-show-" + UUID.randomUUID(), "Summary", "Desc", EventCategory.CONCERT);
        draftEvent.setStatus(EventStatus.DRAFT);
        draftEvent = eventRepository.save(draftEvent);

        UUID draftEventId = draftEvent.getId();
        // Publishing should fail because organization is PENDING
        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            eventService.publishEvent(draftEventId, unverifiedUser.getId());
        });
        assertTrue(ex.getMessage().contains("Organization verification required"));

        // Now verify organization and publishing should succeed
        unverifiedOrg.setVerificationStatus("VERIFIED");
        organizationRepository.save(unverifiedOrg);

        EventDetailDto published = eventService.publishEvent(draftEventId, unverifiedUser.getId());
        assertEquals(EventStatus.PUBLISHED, published.status());
    }

    @Test
    @DisplayName("Coupons: percentage discount with cap and minimum order value")
    void testCouponValidationAndDiscountCalculation() {
        String code = "SAVE25_" + UUID.randomUUID().toString().substring(0, 4);
        couponService.createCoupon(null, new CreateCouponRequest(
                code,
                "25% discount with ₹200 cap on orders over ₹500",
                DiscountType.PERCENTAGE,
                BigDecimal.valueOf(25.00),
                BigDecimal.valueOf(500.00),
                BigDecimal.valueOf(200.00),
                50,
                2,
                Instant.now().minus(1, ChronoUnit.HOURS),
                Instant.now().plus(30, ChronoUnit.DAYS),
                null
        ));

        // Order below min value (₹400 < ₹500)
        CouponValidationResultDto lowOrder = couponService.validateCoupon(
                new ValidateCouponRequest(code, null, BigDecimal.valueOf(400.00)), null
        );
        assertFalse(lowOrder.valid());
        assertTrue(lowOrder.message().contains("Minimum order value"));

        // Order of ₹1,000 -> 25% is ₹250, but capped at ₹200
        CouponValidationResultDto validOrder = couponService.validateCoupon(
                new ValidateCouponRequest(code, null, BigDecimal.valueOf(1000.00)), null
        );
        assertTrue(validOrder.valid());
        assertEquals(0, BigDecimal.valueOf(200.00).compareTo(validOrder.discountAmount()));
        assertEquals(0, BigDecimal.valueOf(800.00).compareTo(validOrder.adjustedSubtotal()));
    }

    @Test
    @DisplayName("Resale Anti-Scalping Policy: resalePrice must be strictly lower than original price")
    void testResaleAntiScalpingPriceRule() {
        Ticket ticket = ticketRepository.findAll().get(0);
        ticket.getSession().setStartsAt(Instant.now().plus(2, ChronoUnit.DAYS));
        ticket.getSession().setEndsAt(Instant.now().plus(2, ChronoUnit.DAYS).plus(3, ChronoUnit.HOURS));
        BigDecimal originalPrice = ticket.getTicketType().getTotalPrice();
        User owner = ticket.getCurrentOwner();

        // Higher price: must be rejected
        assertThrows(BadRequestException.class, () -> {
            resaleService.createListing(owner.getId(), new CreateResaleListingRequest(
                    ticket.getId(), originalPrice.add(BigDecimal.valueOf(100.00))
            ));
        });

        // Equal price: must be rejected
        assertThrows(BadRequestException.class, () -> {
            resaleService.createListing(owner.getId(), new CreateResaleListingRequest(
                    ticket.getId(), originalPrice
            ));
        });

        // Lower price: accepted
        BigDecimal discountedPrice = originalPrice.subtract(BigDecimal.valueOf(250.00));
        ResaleListingDto listing = resaleService.createListing(owner.getId(), new CreateResaleListingRequest(
                ticket.getId(), discountedPrice
        ));

        assertNotNull(listing);
        assertEquals(ResaleListingStatus.ACTIVE, listing.status());
        assertEquals(0, discountedPrice.compareTo(listing.resalePrice()));
        assertTrue(listing.savingsAmount().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("Resale Purchase: atomic transfer of ownership and QR security credential rotation")
    void testResaleAtomicTransferAndQrRotation() {
        Ticket ticket = ticketRepository.findAll().get(0);
        ticket.getSession().setStartsAt(Instant.now().plus(2, ChronoUnit.DAYS));
        ticket.getSession().setEndsAt(Instant.now().plus(2, ChronoUnit.DAYS).plus(3, ChronoUnit.HOURS));
        String oldQrPayload = ticket.getQrCryptographicPayload();
        User originalOwner = ticket.getCurrentOwner();

        BigDecimal discountedPrice = ticket.getTicketType().getTotalPrice().subtract(BigDecimal.valueOf(300.00));
        ResaleListingDto listing = resaleService.createListing(originalOwner.getId(), new CreateResaleListingRequest(
                ticket.getId(), discountedPrice
        ));

        // Create buyer user
        User buyer = userRepository.save(new User("buyer@pulse.test", "buyer_user", "hash", "Aditya Buyer", Role.CUSTOMER));

        // Prevent seller from buying own listing
        assertThrows(BadRequestException.class, () -> {
            resaleService.purchaseResaleListing(listing.id(), originalOwner.getId());
        });

        // Buyer purchases listing
        ResaleListingDto purchased = resaleService.purchaseResaleListing(listing.id(), buyer.getId());
        assertEquals(ResaleListingStatus.SOLD, purchased.status());

        // Verify ticket state updated in DB
        Ticket updatedTicket = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertEquals(buyer.getId(), updatedTicket.getCurrentOwner().getId());
        assertEquals("Aditya Buyer", updatedTicket.getAttendeeName());
        assertEquals("buyer@pulse.test", updatedTicket.getAttendeeEmail());

        // CRITICAL SECURITY ASSERTION: Old QR credential rotated so seller cannot use old QR code
        assertNotEquals(oldQrPayload, updatedTicket.getQrCryptographicPayload());
        assertTrue(updatedTicket.getQrCryptographicPayload().startsWith("EP:" + ticket.getTicketNumber()));
    }

    @Test
    @DisplayName("Enterprise Coupon Scoping: A coupon created for Event A cannot be applied to Event B")
    void testEventSpecificCouponScopeIsolation() {
        var events = eventRepository.findAll();
        assertTrue(events.size() >= 2, "Need at least 2 events for isolation test");
        Event eventA = events.get(0);
        Event eventB = events.get(1);

        String code = "SCOPED_" + UUID.randomUUID().toString().substring(0, 4);
        couponService.createCoupon(null, new CreateCouponRequest(
                code,
                "₹150 off exclusively for " + eventA.getTitle(),
                DiscountType.FIXED,
                BigDecimal.valueOf(150.00),
                BigDecimal.valueOf(300.00),
                BigDecimal.valueOf(150.00),
                100,
                1,
                Instant.now().minus(1, ChronoUnit.HOURS),
                Instant.now().plus(7, ChronoUnit.DAYS),
                eventA.getId()
        ));

        // 1. Validation against Event A must succeed
        CouponValidationResultDto resultA = couponService.validateCoupon(
                new ValidateCouponRequest(code, eventA.getId(), BigDecimal.valueOf(500.00)), null
        );
        assertTrue(resultA.valid(), "Coupon must be valid for Event A");
        assertEquals(0, BigDecimal.valueOf(150.00).compareTo(resultA.discountAmount()));

        // 2. Validation against Event B MUST FAIL with explicit isolation message
        CouponValidationResultDto resultB = couponService.validateCoupon(
                new ValidateCouponRequest(code, eventB.getId(), BigDecimal.valueOf(500.00)), null
        );
        assertFalse(resultB.valid(), "Coupon must NOT be valid for Event B");
        assertTrue(resultB.message().contains("only applicable to") || resultB.message().contains("cannot be applied"),
                "Expected error message mentioning event restriction, got: " + resultB.message());

        // 3. Validation with no eventId specified when coupon is event-scoped must also fail
        CouponValidationResultDto resultNone = couponService.validateCoupon(
                new ValidateCouponRequest(code, null, BigDecimal.valueOf(500.00)), null
        );
        assertFalse(resultNone.valid(), "Coupon must require event matching");
    }

    @Test
    @DisplayName("Enterprise Resale Flow: Listing remains ACTIVE, hold locks checkout for 10 minutes, confirmed payment completes atomic transfer")
    void testResaleFullCheckoutFlow() {
        Ticket ticket = ticketRepository.findAll().get(0);
        ticket.getSession().setStartsAt(Instant.now().plus(2, ChronoUnit.DAYS));
        ticket.getSession().setEndsAt(Instant.now().plus(2, ChronoUnit.DAYS).plus(3, ChronoUnit.HOURS));
        User seller = ticket.getCurrentOwner();
        BigDecimal originalPrice = ticket.getTicketType().getTotalPrice();
        BigDecimal resalePrice = originalPrice.subtract(BigDecimal.valueOf(200.00));

        // 1. Seller lists ticket -> Status must be ACTIVE (NEVER auto-sold!)
        ResaleListingDto listing = resaleService.createListing(seller.getId(), new CreateResaleListingRequest(
                ticket.getId(), resalePrice
        ));
        assertEquals(ResaleListingStatus.ACTIVE, listing.status(), "Listing must be ACTIVE, not automatically sold");

        // 2. Buyer initiates checkout
        User buyer1 = userRepository.save(new User("buyer1_" + UUID.randomUUID() + "@test.io", "b1", "hash", "Buyer One", Role.CUSTOMER));
        var checkoutResponse = resaleService.initiateResaleCheckout(listing.id(), buyer1.getId());

        assertNotNull(checkoutResponse);
        assertEquals(listing.id(), checkoutResponse.listingId());
        // Verify 5% processing fee
        BigDecimal expectedFee = resalePrice.multiply(BigDecimal.valueOf(0.05)).setScale(2, java.math.RoundingMode.HALF_UP);
        assertEquals(0, resalePrice.add(expectedFee).compareTo(checkoutResponse.totalAmount()));
        assertNotNull(checkoutResponse.holdExpiresAt());

        // 3. Another buyer attempts to checkout while hold is active -> ConflictException
        User buyer2 = userRepository.save(new User("buyer2_" + UUID.randomUUID() + "@test.io", "b2", "hash", "Buyer Two", Role.CUSTOMER));
        assertThrows(ConflictException.class, () -> {
            resaleService.initiateResaleCheckout(listing.id(), buyer2.getId());
        }, "Should reject concurrent checkout attempts while locked");

        // 4. Buyer1 confirms purchase with payment
        var confirmRequest = new com.eventpulse.resale.dto.ResaleConfirmPaymentRequest(
                "MOCK",
                checkoutResponse.razorpayOrderId(),
                "pay_resale_test_12345",
                "dummy_sig_test"
        );
        ResaleListingDto soldListing = resaleService.confirmResalePurchase(listing.id(), buyer1.getId(), confirmRequest);
        assertEquals(ResaleListingStatus.SOLD, soldListing.status());

        // Verify ticket ownership transferred in database
        Ticket transferredTicket = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertEquals(buyer1.getId(), transferredTicket.getCurrentOwner().getId());
        assertEquals("Buyer One", transferredTicket.getAttendeeName());
    }

    @Test
    @DisplayName("Enterprise CSV Export: Formula injection mitigation and RFC 4180 escaping")
    void testCsvExportFormulaInjectionMitigation() {
        // Untrusted input starting with dangerous spreadsheet formula triggers
        assertEquals("'=SUM(A1:A10)", csvExportService.sanitize("=SUM(A1:A10)"));
        assertEquals("'+cmd|' /C calc'!A0", csvExportService.sanitize("+cmd|' /C calc'!A0"));
        assertEquals("'-100", csvExportService.sanitize("-100"));
        assertEquals("'@evil", csvExportService.sanitize("@evil"));

        // Commas and quotes properly escaped
        assertEquals("\"Acme, Inc.\"", csvExportService.sanitize("Acme, Inc."));
        assertEquals("\"Say \"\"Hello\"\"\"", csvExportService.sanitize("Say \"Hello\""));

        // Clean safe string passes through
        assertEquals("Safe Conference 2027", csvExportService.sanitize("Safe Conference 2027"));
    }
}
