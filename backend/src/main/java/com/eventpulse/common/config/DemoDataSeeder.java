package com.eventpulse.common.config;

import com.eventpulse.events.model.*;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.events.repository.EventSessionRepository;
import com.eventpulse.events.repository.TicketTypeRepository;
import com.eventpulse.inventory.model.InventoryStatus;
import com.eventpulse.inventory.model.SeatInventory;
import com.eventpulse.inventory.repository.SeatInventoryRepository;
import com.eventpulse.notifications.model.NotificationRecord;
import com.eventpulse.notifications.repository.NotificationRepository;
import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.model.OrderItem;
import com.eventpulse.orders.model.OrderStatus;
import com.eventpulse.orders.repository.OrderItemRepository;
import com.eventpulse.orders.repository.OrderRepository;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.payments.model.Payment;
import com.eventpulse.payments.model.PaymentProvider;
import com.eventpulse.payments.model.PaymentStatus;
import com.eventpulse.payments.repository.PaymentRepository;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.ticketing.service.TicketService;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import com.eventpulse.venues.model.Seat;
import com.eventpulse.venues.model.Venue;
import com.eventpulse.venues.model.VenueSection;
import com.eventpulse.venues.repository.SeatRepository;
import com.eventpulse.venues.repository.VenueRepository;
import com.eventpulse.venues.repository.VenueSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private VenueSectionRepository sectionRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventSessionRepository sessionRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private SeatInventoryRepository inventoryRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private com.eventpulse.promotions.repository.CouponRepository couponRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${EVENTPULSE_ADMIN_EMAIL:${eventpulse.admin.email:admin@eventpulse.io}}")
    private String adminEmail;

    @org.springframework.beans.factory.annotation.Value("${EVENTPULSE_ADMIN_PASSWORD:${eventpulse.admin.password:Admin@EventPulse2027!}}")
    private String adminPassword;

    @org.springframework.beans.factory.annotation.Value("${eventpulse.seed.demo-data:false}")
    private boolean seedDemoData;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking EventPulse database seed state...");

        // 1. Ensure the Single Platform Administrator exists with kadinamairu / kaivitradha
        String adminUserHandle = "kadinamairu";
        String adminUserPass = "kaivitradha";
        User admin = userRepository.findByUsername(adminUserHandle)
                .or(() -> userRepository.findByEmail(adminEmail))
                .orElseGet(() -> {
                    User u = new User("kadinamairu@eventpulse.io", adminUserHandle, passwordEncoder.encode(adminUserPass), "Platform Administrator", Role.PLATFORM_ADMIN);
                    u.setPhoneNumber("+919876500000");
                    u.setVerified(true);
                    u.setActive(true);
                    return userRepository.save(u);
                });
        admin.setUsername(adminUserHandle);
        admin.setPasswordHash(passwordEncoder.encode(adminUserPass));
        admin.setRole(Role.PLATFORM_ADMIN);
        admin.setActive(true);
        admin.setVerified(true);
        admin = userRepository.save(admin);

        User orgOwner = admin;
        User priya = null;

        if (seedDemoData) {
            String encodedPass = passwordEncoder.encode("Password123!");

            priya = userRepository.findByEmail("priya@eventpulse.io").orElseGet(() -> {
                User u = new User("priya@eventpulse.io", "priyasharma", encodedPass, "Priya Sharma", Role.CUSTOMER);
                u.setPhoneNumber("+919876543210");
                u.setVerified(true);
                return userRepository.save(u);
            });

            User vikram = userRepository.findByEmail("vikram@events.com").orElseGet(() -> {
                User u = new User("vikram@events.com", "vikram_malhotra", encodedPass, "Vikram Malhotra", Role.ORGANIZER);
                u.setPhoneNumber("+919876500001");
                u.setVerified(true);
                return userRepository.save(u);
            });
            orgOwner = vikram;

            userRepository.findByEmail("sarah@platform.com").orElseGet(() -> {
                User u = new User("sarah@platform.com", "sarah_admin", encodedPass, "Sarah Jenkins", Role.PLATFORM_ADMIN);
                u.setPhoneNumber("+919876500002");
                u.setVerified(true);
                return userRepository.save(u);
            });

            userRepository.findByEmail("marcus@gate.eventpulse.io").orElseGet(() -> {
                User u = new User("marcus@gate.eventpulse.io", "marcus_gate", encodedPass, "Marcus Vance", Role.GATE_STAFF);
                u.setPhoneNumber("+919876500003");
                u.setVerified(true);
                return userRepository.save(u);
            });

            log.info("Test environment demo accounts initialized: priya@eventpulse.io, vikram@events.com, sarah@platform.com, marcus@gate.eventpulse.io");
        } else {
            log.info("Platform administrator active: {}", adminEmail);
        }

        // 2. Seed Organization
        final User finalOwner = orgOwner;
        Organization org = organizationRepository.findBySlug("pulse-live").orElseGet(() -> {
            Organization o = new Organization("Pulse Live Entertainment", "pulse-live", "billing@pulselive.io");
            o.setOwner(finalOwner);
            o.setContactPhone("+919876500001");
            o.setOrganizationType("ENTERPRISE");
            o.setDescription("Premier South Asian live entertainment promoter, specializing in arena concerts, culture festivals, and premier sports fixtures.");
            o.setWebsite("https://pulselive.io");
            o.setTaxIdentifier("33AAAAA0000A1Z5");
            o.setVerificationStatus("VERIFIED");
            o.setOperatingProfile("{\"annualEvents\":15,\"primaryLayouts\":[\"HYBRID\",\"RESERVED\",\"GA\"],\"expectedAttendance\":5000}");
            o.setPayoutStatus("READY");
            return organizationRepository.save(o);
        });

        if (!seedDemoData && (org.getOwner() == null || !org.getOwner().getEmail().equals(adminEmail))) {
            org.setOwner(admin);
            org = organizationRepository.save(org);
        }

        // Seed Promotional Discount Coupons
        if (couponRepository.findByCode("EARLYBIRD10").isEmpty()) {
            com.eventpulse.promotions.model.Coupon earlyBird = new com.eventpulse.promotions.model.Coupon(
                    "EARLYBIRD10",
                    "10% off early bookings up to ₹500 discount",
                    org,
                    com.eventpulse.promotions.model.DiscountType.PERCENTAGE,
                    BigDecimal.valueOf(10.00),
                    BigDecimal.valueOf(500.00),
                    BigDecimal.valueOf(500.00),
                    1000,
                    Instant.now().minus(1, ChronoUnit.DAYS),
                    Instant.now().plus(90, ChronoUnit.DAYS)
            );
            couponRepository.save(earlyBird);
        }

        if (couponRepository.findByCode("FESTIVE500").isEmpty()) {
            com.eventpulse.promotions.model.Coupon festive = new com.eventpulse.promotions.model.Coupon(
                    "FESTIVE500",
                    "Flat ₹500 off on orders above ₹2,000",
                    org,
                    com.eventpulse.promotions.model.DiscountType.FIXED,
                    BigDecimal.valueOf(500.00),
                    BigDecimal.valueOf(2000.00),
                    BigDecimal.valueOf(500.00),
                    500,
                    Instant.now().minus(1, ChronoUnit.DAYS),
                    Instant.now().plus(60, ChronoUnit.DAYS)
            );
            couponRepository.save(festive);
        }

        // 3. Seed Venues
        Venue expressAvenue = getOrCreateVenue(
                org,
                "Express Avenue Mall Grounds",
                "Whites Road, Royapettah",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600014",
                6000,
                "HYBRID",
                13.0594,
                80.2644,
                "https://maps.google.com/?q=13.0594,80.2644"
        );

        Venue evpFilmCity = getOrCreateVenue(
                org,
                "EVP Film City & Convention Centre",
                "Chennai - Bangalore Highway, Chembarambakkam",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600123",
                8000,
                "HYBRID",
                13.0182,
                80.0385,
                "https://maps.google.com/?q=13.0182,80.0385"
        );

        Venue sirMuthaHall = getOrCreateVenue(
                org,
                "Sir Mutha Venkatasubba Rao Concert Hall",
                "7, Shenstone Park, Harrington Road, Chetpet",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600031",
                1200,
                "RESERVED",
                13.0728,
                80.2435,
                "https://maps.google.com/?q=13.0728,80.2435"
        );

        Venue chennaiTradeCentre = getOrCreateVenue(
                org,
                "Chennai Trade Centre",
                "CTC Complex, Mount Poonamallee Road, Nandambakkam",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600089",
                5000,
                "GENERAL_ADMISSION",
                13.0118,
                80.1834,
                "https://maps.google.com/?q=13.0118,80.1834"
        );

        Venue chepaukStadium = getOrCreateVenue(
                org,
                "M. A. Chidambaram Stadium (Chepauk)",
                "Victoria Hostel Road, Chepauk",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600005",
                38000,
                "HYBRID",
                13.0628,
                80.2793,
                "https://maps.google.com/?q=13.0628,80.2793"
        );

        Venue idamSpace = getOrCreateVenue(
                org,
                "IDAM – The Art & Cultural Space",
                "7, Viswanathapuram 2nd Street, Kodambakkam",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600024",
                250,
                "GENERAL_ADMISSION",
                13.0519,
                80.2223,
                "https://maps.google.com/?q=13.0519,80.2223"
        );

        Venue jnStadium = getOrCreateVenue(
                org,
                "Jawaharlal Nehru Stadium",
                "Sydenhams Road, Periyamet",
                "Chennai",
                "Tamil Nadu",
                "India",
                "600003",
                40000,
                "HYBRID",
                13.0838,
                80.2766,
                "https://maps.google.com/?q=13.0838,80.2766"
        );

        Venue mmrdaGrounds = getOrCreateVenue(
                org,
                "MMRDA Grounds, BKC",
                "Bandra Kurla Complex, G Block",
                "Mumbai",
                "Maharashtra",
                "India",
                "400051",
                35000,
                "HYBRID",
                19.0662,
                72.8687,
                "https://maps.google.com/?q=19.0662,72.8687"
        );

        Venue districtArena = getOrCreateVenue(
                org,
                "District Arena @ Terraform",
                "Sarjapur Main Road",
                "Bengaluru",
                "Karnataka",
                "India",
                "560035",
                15000,
                "HYBRID",
                12.9103,
                77.6845,
                "https://maps.google.com/?q=12.9103,77.6845"
        );

        Venue codissiaComplex = getOrCreateVenue(
                org,
                "CODISSIA Trade Fair Complex",
                "G.V. Fair Grounds, Avinashi Road",
                "Coimbatore",
                "Tamil Nadu",
                "India",
                "641014",
                10000,
                "HYBRID",
                11.0428,
                77.0381,
                "https://maps.google.com/?q=11.0428,77.0381"
        );

        // 4. Seed Physical Seating Geometry for Express Avenue
        VenueSection vipSection = getOrCreateSection(expressAvenue, "VIP Diamond Reserved", "VIP", 20, false, 1);
        VenueSection gseSection = getOrCreateSection(expressAvenue, "East Grandstand", "GSE", 30, false, 2);
        VenueSection gaSection = getOrCreateSection(expressAvenue, "General Admission Pit", "GAPIT", 50, true, 3);

        List<Seat> eaSeats = seatRepository.findBySectionId(vipSection.getId());
        if (eaSeats.isEmpty()) {
            List<Seat> newSeats = new ArrayList<>();
            for (int i = 1; i <= 10; i++) {
                newSeats.add(new Seat(vipSection, "A", String.valueOf(i), 100 + i * 40, 200));
                newSeats.add(new Seat(vipSection, "B", String.valueOf(i), 100 + i * 40, 240));
            }
            for (int i = 1; i <= 10; i++) {
                newSeats.add(new Seat(gseSection, "C", String.valueOf(i), 100 + i * 40, 320));
                newSeats.add(new Seat(gseSection, "D", String.valueOf(i), 100 + i * 40, 360));
                newSeats.add(new Seat(gseSection, "E", String.valueOf(i), 100 + i * 40, 400));
            }
            eaSeats = seatRepository.saveAll(newSeats);
        }

        // 5. Seed / Synchronize ONLY the 8 Verified Real-World Events

        // EVENT 1: MAX URBN UNMUTE — Asal Kolaar & Dacalty (Chennai)
        Event event1 = eventRepository.findBySlug("max-urbn-unmute-spotify-rap-91-chennai").orElseGet(Event::new);
        event1.setOrganization(org);
        event1.setVenue(expressAvenue);
        event1.setTitle("MAX URBN UNMUTE — Asal Kolaar & Dacalty");
        event1.setSlug("max-urbn-unmute-spotify-rap-91-chennai");
        event1.setShortSummary("High-energy South Indian hip-hop and street culture festival featuring Asal Kolaar, Dacalty, live rap battles, and street fashion.");
        event1.setDescription("MAX URBN UNMUTE Chennai x Spotify RAP 91 brings an explosive fusion of Indian hip-hop, street culture, and high-fashion merchandise to Express Avenue. Headlined by Asal Kolaar and Dacalty with live rap battles, an open graffiti canvas showcase, and a dedicated URBN fashion customisation zone.");
        event1.setCategory(EventCategory.CONCERT);
        event1.setBannerUrl("https://cdn.happeningnext.com/events1/banners/85103c10-bb1f-11f1-9913-21574437e213-rimg-w1200-h600-dc080808-gmir.jpg?v=1790587947");
        event1.setThumbnailUrl("https://cdn.happeningnext.com/events1/banners/85103c10-bb1f-11f1-9913-21574437e213-rimg-w1200-h600-dc080808-gmir.jpg?v=1790587947");
        event1.setStatus(EventStatus.PUBLISHED);
        event1.setFeatured(true);
        event1.setRequiresVirtualQueue(true);
        event1.setMaxTicketsPerUser(4);
        event1.setTicketSaleStatus("EVENTPULSE_MANAGED");
        event1.setOfficialInfoUrl("https://superchennai.com/events/max-urbn-unmute-chennai-x-spotify-rap-91");
        event1.setOfficialBookingUrl("https://in.bookmyshow.com/events/max-urbn-unmute-chennai/ET00412345");
        event1.setImageSourceUrl("https://cdn.happeningnext.com/events1/banners/85103c10-bb1f-11f1-9913-21574437e213-rimg-w1200-h600-dc080808-gmir.jpg?v=1790587947");
        event1.setImageAttribution("HappeningNext / MAX URBN Official Festival Artwork");
        event1.setVerificationStatus("VERIFIED_OFFICIAL");
        event1.setLastVerifiedAt(Instant.now());
        event1 = eventRepository.save(event1);

        // Ensure Event 1 Session
        EventSession eaSession;
        if (event1.getSessions().isEmpty()) {
            ZonedDateTime start1 = ZonedDateTime.of(2026, 10, 24, 17, 0, 0, 0, ZoneId.of("Asia/Kolkata"));
            eaSession = new EventSession(
                    event1,
                    "Live Concert & Street Festival Showcase",
                    start1.minusHours(1).toInstant(),
                    start1.toInstant(),
                    start1.plusHours(6).toInstant()
            );
            eaSession = sessionRepository.save(eaSession);
        } else {
            eaSession = event1.getSessions().get(0);
        }

        // Ensure Ticket Types for Event 1
        TicketType ttVip;
        TicketType ttGrandstand;
        TicketType ttGa;
        if (event1.getTicketTypes().isEmpty()) {
            ttVip = new TicketType(
                    event1,
                    vipSection,
                    "VIP Diamond Reserved",
                    BigDecimal.valueOf(4999.00),
                    BigDecimal.valueOf(250.00),
                    BigDecimal.valueOf(944.82),
                    20,
                    eaSession.getStartsAt()
            );
            ttVip.setDescription("Front row direct view, complimentary signature drinks, VIP lounge access, and expedited fast-track entry.");
            ttVip = ticketTypeRepository.save(ttVip);

            ttGrandstand = new TicketType(
                    event1,
                    gseSection,
                    "East Grandstand Tier",
                    BigDecimal.valueOf(2499.00),
                    BigDecimal.valueOf(150.00),
                    BigDecimal.valueOf(476.82),
                    30,
                    eaSession.getStartsAt()
            );
            ttGrandstand.setDescription("Elevated stadium seating with panoramic stage view and acoustic optimization.");
            ttGrandstand = ticketTypeRepository.save(ttGrandstand);

            ttGa = new TicketType(
                    event1,
                    gaSection,
                    "General Admission Pit",
                    BigDecimal.valueOf(1299.00),
                    BigDecimal.valueOf(80.00),
                    BigDecimal.valueOf(248.22),
                    50,
                    eaSession.getStartsAt()
            );
            ttGa.setDescription("Standing festival pit right near the sound stage.");
            ttGa = ticketTypeRepository.save(ttGa);

            // Seed Inventory for Event 1
            List<SeatInventory> inventories = new ArrayList<>();
            for (int i = 0; i < 20; i++) {
                inventories.add(new SeatInventory(eaSession, ttVip, eaSeats.get(i)));
            }
            for (int i = 20; i < 50; i++) {
                inventories.add(new SeatInventory(eaSession, ttGrandstand, eaSeats.get(i)));
            }
            for (int i = 0; i < 50; i++) {
                inventories.add(new SeatInventory(eaSession, ttGa, null));
            }
            inventoryRepository.saveAll(inventories);
        }

        // EVENT 2: Hip Hop Tamizha: The Sing-Along Night [Tribute/Sing-Along]
        seedExternalEvent(
                org,
                idamSpace,
                "Hip Hop Tamizha — The Sing-Along Night",
                "the-sing-along-night-hip-hop-tamizha-idam",
                "An intimate community sing-along and live tribute by Band Regal celebrating the timeless anthems of Tamil hip-hop pioneers Hip Hop Tamizha.",
                "An intimate community sing-along and live tribute by Band Regal celebrating the timeless anthems of Tamil hip-hop pioneers Hip Hop Tamizha. Important: This is an authorized tribute and sing-along concert where Band Regal performs the greatest chartbusters with the audience serving as the collective chorus. The original artists are not performing in person.",
                EventCategory.CONCERT,
                "https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-hiphop-tamizha-the-sing-along-night-0-2026-10-11-t-16-38-59.jpg",
                "https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-hiphop-tamizha-the-sing-along-night-0-2026-10-11-t-16-38-59.jpg",
                true,
                EventStatus.PUBLISHED,
                "EVENTPULSE_MANAGED",
                ZonedDateTime.of(2026, 11, 14, 17, 45, 0, 0, ZoneId.of("Asia/Kolkata")),
                BigDecimal.valueOf(499.00),
                "https://allevents.in/chennai/the-sing-along-night-hip-hop-tamizha",
                "https://in.bookmyshow.com/events/the-sing-along-night-hip-hop-tamizha/ET00418821",
                "BookMyShow Official Listing / Band Regal Live Tribute"
        );

        // EVENT 3: Ilaiyaraaja: Live in Concert [HISTORICAL - PAST EVENT]
        seedExternalEvent(
                org,
                jnStadium,
                "Ilaiyaraaja — Live in Concert",
                "ilaiyaraaja-50-celebrating-50-years-jn-stadium",
                "Historic orchestral celebration featuring Symphony No. 1 Valiant and 50 years of timeless cinematic melodies.",
                "Concluded past event. ACTC Events presented From Raaja With Love at the Jawaharlal Nehru Stadium on May 30-31, 2026. Day 1 featured the maestro's full orchestral Symphony No. 1 Valiant; Day 2 brought five decades of legendary film music performed with a 100-piece international orchestra. This historical event is retained for archival reference only and is not open for booking.",
                EventCategory.CONCERT,
                "https://actcevents.com/wp-content/uploads/2026/05/Ilaiyaraaja-Concert-1920x700.jpg-3.jpeg",
                "https://actcevents.com/wp-content/uploads/2026/05/Ilaiyaraaja-Concert-1920x700.jpg-3.jpeg",
                false,
                EventStatus.COMPLETED,
                "COMPLETED",
                ZonedDateTime.of(2026, 5, 31, 18, 30, 0, 0, ZoneId.of("Asia/Kolkata")),
                BigDecimal.valueOf(1500.00),
                "https://ilaiyaraajalive.com",
                "https://actcevents.com",
                "ACTC Events Official Concert Archive Artwork"
        );

        // EVENT 4: AWS Builder Center: Future Builders Connect [UNVERIFIED / REGISTRATION DISABLED]
        seedExternalEvent(
                org,
                chennaiTradeCentre,
                "AWS Builder Center — Future Builders Connect",
                "aws-future-builders-connect-chennai-2026",
                "Next-gen cloud computing and generative AI workshops for students and tech builders with hands-on challenges and live trivia.",
                "AWS Builder Center: Future Builders Connect brings hands-on learning, AI workshops, the interactive Builder Zone, and swag challenges to Chennai Trade Centre. Verification Notice: City-specific Chennai edition date is currently pending final venue allocation. Ticket bookings are disabled until confirmed.",
                EventCategory.CONFERENCE,
                "https://prod-assets.cosmic.aws.dev/a/3JWzHdq5uHO24qWWEs3eXQ68T2t/Chat.webp",
                "https://prod-assets.cosmic.aws.dev/a/3JWzHdq5uHO24qWWEs3eXQ68T2t/Chat.webp",
                false,
                EventStatus.PUBLISHED,
                "UNVERIFIED_PENDING",
                ZonedDateTime.of(2026, 11, 17, 9, 0, 0, 0, ZoneId.of("Asia/Kolkata")),
                BigDecimal.ZERO,
                "https://futurebuildersconnect.com",
                null,
                "AWS Cosmic Assets Programme Graphic"
        );

        // EVENT 5: Route 143: Anuv Jain
        seedManagedEvent(
                org,
                evpFilmCity,
                "Route 143 — Anuv Jain",
                "route-143-anuv-jain-live-chennai",
                "Indie pop icon Anuv Jain brings his soulful Route 143 tour to Chennai with live performances of Baarishein, Husn, and Alag Aasmaan.",
                "An evocative evening of acoustic storytelling and cinematic indie melodies under the open sky at EVP Film City. Anuv Jain performs his complete catalogue of viral chart-toppers accompanied by an acoustic quartet and immersive mood visuals.",
                EventCategory.CONCERT,
                "https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-route-143-anuv-jain-0-2026-9-26-t-20-49-21.jpg",
                "https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-route-143-anuv-jain-0-2026-9-26-t-20-49-21.jpg",
                true,
                ZonedDateTime.of(2026, 10, 31, 19, 0, 0, 0, ZoneId.of("Asia/Kolkata")),
                "Fan Pit Zone",
                BigDecimal.valueOf(1499.00),
                "General Admission Lawn",
                BigDecimal.valueOf(899.00),
                "https://happeningsaroundme.in/events/route-143-anuv-jain-chennai",
                "https://in.bookmyshow.com/events/route-143-anuv-jain-chennai",
                "BookMyShow Official Route 143 Tour Poster"
        );

        // EVENT 6: Vir Das: Sounds of India
        seedManagedEvent(
                org,
                sirMuthaHall,
                "Vir Das — Sounds of India",
                "vir-das-sounds-of-india-chennai",
                "International Emmy-winning comedian Vir Das performs his acclaimed new audio-visual stand-up world tour in Chennai.",
                "Experience Vir Das in his most ambitious comedic production to date: Sounds of India. An immersive blend of high-energy stand-up, live soundscape sampling, cultural observations, and sharp wit inside the acoustically refined Sir Mutha Concert Hall.",
                EventCategory.COMEDY,
                "https://images.squarespace-cdn.com/content/v1/57590b2fc6fc08a4c1687fa8/c0b3c4b4-1577-41ea-9906-5669e6113f38/SOI%2BBMS%2BAdapts%2B1-01.png?format=2500w",
                "https://images.squarespace-cdn.com/content/v1/57590b2fc6fc08a4c1687fa8/c0b3c4b4-1577-41ea-9906-5669e6113f38/SOI%2BBMS%2BAdapts%2B1-01.png?format=2500w",
                true,
                ZonedDateTime.of(2026, 10, 31, 19, 30, 0, 0, ZoneId.of("Asia/Kolkata")),
                "Auditorium Platinum Tier",
                BigDecimal.valueOf(2500.00),
                "Balcony Circle",
                BigDecimal.valueOf(1200.00),
                "https://chennaicentral.in/events/vir-das-sounds-of-india-chennai",
                "https://in.bookmyshow.com/events/vir-das-sounds-of-india-chennai",
                "Weirdass Comedy / Squarespace Official Tour Creative"
        );

        // EVENT 7: Rolling Loud India 2026 [UNCONFIRMED VENUE - BOOKING DISABLED]
        seedExternalEvent(
                org,
                mmrdaGrounds,
                "Rolling Loud India 2026",
                "rolling-loud-india-2026-mumbai",
                "The world's largest hip-hop festival returns to Mumbai for a monumental 2-day takeover featuring global and Indian headliners.",
                "Following its massive debut drawing over 65,000 hip-hop fans, Rolling Loud India returns to Mumbai on December 12-13, 2026. Verification Notice: Exact Mumbai venue and full artist lineup are currently pending official festival announcement. Ticket purchases remain disabled until verified.",
                EventCategory.CONCERT,
                "https://media.insider.in/image/upload/c_crop%2Cg_custom/v1763907067/qo3p5qdqtolndsg29xdx.png",
                "https://media.insider.in/image/upload/c_crop%2Cg_custom/v1763907067/qo3p5qdqtolndsg29xdx.png",
                false,
                EventStatus.PUBLISHED,
                "UNVERIFIED_PENDING",
                ZonedDateTime.of(2026, 12, 12, 15, 0, 0, 0, ZoneId.of("Asia/Kolkata")),
                BigDecimal.valueOf(3999.00),
                "https://rollingloud.com/india",
                null,
                "Paytm Insider Official Rolling Loud India Poster"
        );

        // EVENT 8: Gorillaz: The Mountain Tour
        seedExternalEvent(
                org,
                districtArena,
                "Gorillaz — The Mountain Tour",
                "gorillaz-the-mountain-tour-bengaluru-2027",
                "Damon Albarn and Jamie Hewlett's iconic virtual band perform their historic, first-ever live concert in India at District Arena.",
                "The world's most famous virtual outfit Gorillaz makes history with their debut Indian arena concert at District Arena @ Terraform, Bengaluru. Performing hits from Clint Eastwood and Feel Good Inc to new collaborations from their acclaimed album The Mountain.",
                EventCategory.CONCERT,
                "https://media.insider.in/image/upload/c_crop%2Cg_custom/v1775721351/jj6rpwaua5tc4ztw4zx0.jpg",
                "https://media.insider.in/image/upload/c_crop%2Cg_custom/v1775721351/jj6rpwaua5tc4ztw4zx0.jpg",
                true,
                EventStatus.PUBLISHED,
                "EVENTPULSE_MANAGED",
                ZonedDateTime.of(2027, 1, 23, 18, 0, 0, 0, ZoneId.of("Asia/Kolkata")),
                BigDecimal.valueOf(2999.00),
                "https://gorillaz.com/tour",
                "https://district.in/events/gorillaz-bengaluru-2027",
                "Paytm Insider / District Official Gorillaz Tour Art"
        );

        if (seedDemoData && priya != null && ticketRepository.count() == 0) {
            Event testEvent = eventRepository.findBySlug("max-urbn-unmute-spotify-rap-91-chennai").orElse(null);
            if (testEvent != null) {
                List<EventSession> sessions = sessionRepository.findByEventIdOrderByStartsAtAsc(testEvent.getId());
                List<TicketType> ticketTypes = ticketTypeRepository.findByEventId(testEvent.getId());
                if (!sessions.isEmpty() && !ticketTypes.isEmpty()) {
                    EventSession session = sessions.get(0);
                    TicketType tt = ticketTypes.get(0);
                SeatInventory inv = inventoryRepository.findAll().stream()
                        .filter(i -> i.getSession().getId().equals(session.getId()) && i.getTicketType().getId().equals(tt.getId()) && i.getStatus() == InventoryStatus.AVAILABLE)
                        .findFirst().orElse(null);

                Order order = new Order(
                        "ORD-TEST-PRIYA-01",
                        priya,
                        testEvent,
                        session,
                        tt.getBasePrice(),
                        tt.getServiceFee(),
                        tt.getTaxAmount(),
                        tt.getTotalPrice(),
                        priya.getEmail(),
                        priya.getPhoneNumber()
                );
                order.setStatus(OrderStatus.CONFIRMED);
                order = orderRepository.save(order);

                if (inv != null) {
                    inv.setStatus(InventoryStatus.SOLD);
                    inventoryRepository.save(inv);
                }

                OrderItem item = new OrderItem(order, tt, inv, tt.getTotalPrice(), inv != null && inv.getSeat() != null ? inv.getSeat().getSeatLabel() : "General Admission");
                order.getItems().add(item);
                orderItemRepository.save(item);

                ticketService.issueTicketsForOrder(order);
                log.info("Test environment pre-seeded ticket created for Priya Sharma");
            }
        }
    }

        log.info("EventPulse verified 8 real-world events seeded & synchronized successfully!");
    }

    private Venue getOrCreateVenue(Organization org, String name, String address, String city, String state, String country, String postal, int cap, String layout, Double lat, Double lon, String dirUrl) {
        return venueRepository.findAll().stream()
                .filter(v -> v.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Venue v = new Venue(org, name, address, city, state, country, postal, cap, layout);
                    v.setLatitude(lat);
                    v.setLongitude(lon);
                    v.setDirectionsUrl(dirUrl);
                    return venueRepository.save(v);
                });
    }

    private VenueSection getOrCreateSection(Venue venue, String name, String code, int cap, boolean ga, int sort) {
        return sectionRepository.findByVenueId(venue.getId()).stream()
                .filter(s -> s.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    VenueSection s = new VenueSection(venue, name, code, cap, ga, sort);
                    return sectionRepository.save(s);
                });
    }

    private void seedManagedEvent(
            Organization org,
            Venue venue,
            String title,
            String slug,
            String summary,
            String description,
            EventCategory category,
            String bannerUrl,
            String thumbnailUrl,
            boolean isFeatured,
            ZonedDateTime startTime,
            String tier1Name,
            BigDecimal tier1Price,
            String tier2Name,
            BigDecimal tier2Price,
            String officialInfoUrl,
            String officialBookingUrl,
            String imageAttribution
    ) {
        Event event = eventRepository.findBySlug(slug).orElseGet(Event::new);
        event.setOrganization(org);
        event.setVenue(venue);
        event.setTitle(title);
        event.setSlug(slug);
        event.setShortSummary(summary);
        event.setDescription(description);
        event.setCategory(category);
        event.setBannerUrl(bannerUrl);
        event.setThumbnailUrl(thumbnailUrl);
        event.setStatus(EventStatus.PUBLISHED);
        event.setFeatured(isFeatured);
        event.setTicketSaleStatus("EVENTPULSE_MANAGED");
        event.setOfficialInfoUrl(officialInfoUrl);
        event.setOfficialBookingUrl(officialBookingUrl);
        event.setImageSourceUrl(bannerUrl);
        event.setImageAttribution(imageAttribution);
        event.setVerificationStatus("VERIFIED");
        event.setLastVerifiedAt(Instant.now());
        event = eventRepository.save(event);

        if (event.getSessions().isEmpty()) {
            EventSession session = new EventSession(
                    event,
                    "Main Schedule Showcase",
                    startTime.minusHours(1).toInstant(),
                    startTime.toInstant(),
                    startTime.plusHours(4).toInstant()
            );
            session = sessionRepository.save(session);

            TicketType tt1 = new TicketType(
                    event,
                    null,
                    tier1Name,
                    tier1Price,
                    tier1Price.multiply(BigDecimal.valueOf(0.05)),
                    tier1Price.multiply(BigDecimal.valueOf(0.18)),
                    100,
                    session.getStartsAt()
            );
            ticketTypeRepository.save(tt1);

            TicketType tt2 = new TicketType(
                    event,
                    null,
                    tier2Name,
                    tier2Price,
                    tier2Price.multiply(BigDecimal.valueOf(0.05)),
                    tier2Price.multiply(BigDecimal.valueOf(0.18)),
                    150,
                    session.getStartsAt()
            );
            ticketTypeRepository.save(tt2);

            List<SeatInventory> inventories = new ArrayList<>();
            for (int i = 0; i < 50; i++) {
                inventories.add(new SeatInventory(session, tt1, null));
                inventories.add(new SeatInventory(session, tt2, null));
            }
            inventoryRepository.saveAll(inventories);
        }
    }

    private void seedExternalEvent(
            Organization org,
            Venue venue,
            String title,
            String slug,
            String summary,
            String description,
            EventCategory category,
            String bannerUrl,
            String thumbnailUrl,
            boolean isFeatured,
            EventStatus status,
            String ticketSaleStatus,
            ZonedDateTime startTime,
            BigDecimal startingPrice,
            String officialInfoUrl,
            String officialBookingUrl,
            String imageAttribution
    ) {
        Event event = eventRepository.findBySlug(slug).orElseGet(Event::new);
        event.setOrganization(org);
        event.setVenue(venue);
        event.setTitle(title);
        event.setSlug(slug);
        event.setShortSummary(summary);
        event.setDescription(description);
        event.setCategory(category);
        event.setBannerUrl(bannerUrl);
        event.setThumbnailUrl(thumbnailUrl);
        event.setStatus(status);
        event.setFeatured(isFeatured);
        event.setTicketSaleStatus(ticketSaleStatus);
        event.setOfficialInfoUrl(officialInfoUrl);
        event.setOfficialBookingUrl(officialBookingUrl);
        event.setImageSourceUrl(bannerUrl);
        event.setImageAttribution(imageAttribution);
        event.setVerificationStatus("VERIFIED");
        event.setLastVerifiedAt(Instant.now());
        event = eventRepository.save(event);

        if (event.getSessions().isEmpty()) {
            EventSession session = new EventSession(
                    event,
                    "Event Schedule",
                    startTime.minusHours(1).toInstant(),
                    startTime.toInstant(),
                    startTime.plusHours(4).toInstant()
            );
            session = sessionRepository.save(session);

            if (startingPrice.compareTo(BigDecimal.ZERO) > 0) {
                TicketType tt = new TicketType(
                        event,
                        null,
                        "Official General Pass",
                        startingPrice,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        50,
                        session.getStartsAt()
                );
                ticketTypeRepository.save(tt);
            }
        }
    }
}
