package com.eventpulse.events.service;

import com.eventpulse.common.api.PageMetadata;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.events.dto.*;
import com.eventpulse.events.model.*;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.events.repository.EventSessionRepository;
import com.eventpulse.events.repository.TicketTypeRepository;
import com.eventpulse.inventory.model.SeatInventory;
import com.eventpulse.inventory.repository.SeatInventoryRepository;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.venues.model.Seat;
import com.eventpulse.venues.model.Venue;
import com.eventpulse.venues.model.VenueSection;
import com.eventpulse.venues.repository.SeatRepository;
import com.eventpulse.venues.repository.VenueRepository;
import com.eventpulse.venues.repository.VenueSectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventSessionRepository sessionRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private VenueSectionRepository sectionRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private SeatInventoryRepository inventoryRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private com.eventpulse.ticketing.repository.TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public Page<EventSummaryDto> searchEvents(EventCategory category, String city, String status, String query, Pageable pageable) {
        List<EventStatus> targetStatuses;
        if ("PAST".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status)) {
            targetStatuses = List.of(EventStatus.COMPLETED);
        } else if ("ALL".equalsIgnoreCase(status)) {
            targetStatuses = List.of(EventStatus.PUBLISHED, EventStatus.SALES_OPEN, EventStatus.COMPLETED);
        } else {
            targetStatuses = List.of(EventStatus.PUBLISHED, EventStatus.SALES_OPEN);
        }

        String pattern = (query != null && !query.trim().isEmpty()) ? "%" + query.trim().toLowerCase() + "%" : null;
        String cityFilter = (city != null && !city.trim().isEmpty() && !"ALL".equalsIgnoreCase(city.trim())) ? city.trim().toLowerCase() : null;

        if (category == null && cityFilter == null && pattern == null) {
            return eventRepository.findByStatusIn(targetStatuses, pageable).map(this::toSummaryDto);
        }
        if (category != null && cityFilter == null && pattern == null) {
            return eventRepository.findByStatusInAndCategory(targetStatuses, category, pageable).map(this::toSummaryDto);
        }

        return eventRepository.searchEvents(targetStatuses, category, cityFilter, pattern, pageable).map(this::toSummaryDto);
    }

    @Transactional(readOnly = true)
    public Page<EventSummaryDto> searchEvents(EventCategory category, String query, Pageable pageable) {
        return searchEvents(category, null, null, query, pageable);
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDto> getPastEvents() {
        List<Event> past = eventRepository.findByStatusInOrderByCreatedAtDesc(List.of(EventStatus.COMPLETED));
        return past.stream().map(this::toSummaryDto).toList();
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDto> getFeaturedEvents() {
        List<Event> featured = eventRepository.findByIsFeaturedTrueAndStatusIn(List.of(EventStatus.PUBLISHED, EventStatus.SALES_OPEN));
        return featured.stream().map(this::toSummaryDto).toList();
    }

    @Transactional(readOnly = true)
    public EventDetailDto getEventByIdOrSlug(String idOrSlug) {
        Event event;
        try {
            UUID id = UUID.fromString(idOrSlug);
            event = eventRepository.findById(id)
                    .orElseGet(() -> eventRepository.findBySlug(idOrSlug)
                            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + idOrSlug)));
        } catch (IllegalArgumentException e) {
            event = eventRepository.findBySlug(idOrSlug)
                    .orElseThrow(() -> new ResourceNotFoundException("Event not found with slug: " + idOrSlug));
        }

        return toDetailDto(event);
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDto> getOrganizerEvents() {
        return getOrganizerEvents(null);
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDto> getOrganizerEvents(UUID organizerUserId) {
        if (organizerUserId != null) {
            Organization org = organizationRepository.findFirstByOwnerId(organizerUserId).orElse(null);
            if (org != null) {
                return eventRepository.findByOrganizationIdOrderByCreatedAtDesc(org.getId()).stream()
                        .map(this::toSummaryDto)
                        .toList();
            }
        }
        return eventRepository.findAll().stream().map(this::toSummaryDto).toList();
    }

    @Transactional
    public EventDetailDto createEvent(CreateEventRequest request, UUID organizerUserId) {
        Venue venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + request.venueId()));

        Organization organization = venue.getOrganization();

        String slug = generateSlug(request.title()) + "-" + UUID.randomUUID().toString().substring(0, 8);

        Event event = new Event(
                organization,
                venue,
                request.title().trim(),
                slug,
                request.shortSummary().trim(),
                request.description().trim(),
                request.category()
        );
        event.setBannerUrl(request.bannerUrl());
        event.setThumbnailUrl(request.thumbnailUrl());
        event.setFeatured(request.isFeatured());
        event.setRequiresVirtualQueue(request.requiresVirtualQueue());
        event.setMaxTicketsPerUser(request.maxTicketsPerUser() > 0 ? request.maxTicketsPerUser() : 6);
        event.setStatus(EventStatus.PUBLISHED);

        event = eventRepository.save(event);

        // Create sessions
        List<EventSession> sessions = new ArrayList<>();
        if (request.sessions() != null && !request.sessions().isEmpty()) {
            for (CreateEventRequest.CreateSessionRequest sReq : request.sessions()) {
                EventSession session = new EventSession(event, sReq.sessionTitle(), sReq.doorsOpenAt(), sReq.startsAt(), sReq.endsAt());
                sessions.add(sessionRepository.save(session));
            }
        } else {
            // Default session
            Instant now = Instant.now();
            EventSession defaultSession = new EventSession(
                    event,
                    "Main Performance",
                    now.plusSeconds(86400 * 7),
                    now.plusSeconds(86400 * 7 + 3600),
                    now.plusSeconds(86400 * 7 + 14400)
            );
            sessions.add(sessionRepository.save(defaultSession));
        }

        // Create ticket types
        List<TicketType> ticketTypes = new ArrayList<>();
        if (request.ticketTypes() != null && !request.ticketTypes().isEmpty()) {
            for (CreateEventRequest.CreateTicketTypeRequest ttReq : request.ticketTypes()) {
                VenueSection section = ttReq.sectionId() != null ? sectionRepository.findById(ttReq.sectionId()).orElse(null) : null;
                TicketType ticketType = new TicketType(
                        event,
                        section,
                        ttReq.name(),
                        ttReq.basePrice(),
                        ttReq.serviceFee(),
                        ttReq.taxAmount(),
                        ttReq.quota() > 0 ? ttReq.quota() : 100,
                        ttReq.salesEndAt() != null ? ttReq.salesEndAt() : sessions.get(0).getStartsAt()
                );
                ticketType.setDescription(ttReq.description());
                ticketTypes.add(ticketTypeRepository.save(ticketType));
            }
        } else {
            // Default ticket type
            TicketType defaultTt = new TicketType(
                    event,
                    null,
                    "General Admission",
                    BigDecimal.valueOf(999.00),
                    BigDecimal.valueOf(50.00),
                    BigDecimal.valueOf(188.82),
                    100,
                    sessions.get(0).getStartsAt()
            );
            defaultTt.setDescription("Standard admission pass");
            ticketTypes.add(ticketTypeRepository.save(defaultTt));
        }

        // Initialize inventory for session 0 and ticket types
        initializeInventoryForEvent(sessions.get(0), ticketTypes, venue);

        event.setSessions(sessions);
        event.setTicketTypes(ticketTypes);
        return toDetailDto(event);
    }

    private void initializeInventoryForEvent(EventSession session, List<TicketType> ticketTypes, Venue venue) {
        List<SeatInventory> inventories = new ArrayList<>();
        List<Seat> venueSeats = seatRepository.findBySectionVenueId(venue.getId());

        for (TicketType tt : ticketTypes) {
            if (tt.getSection() != null) {
                // Reserved seating for specific section
                List<Seat> sectionSeats = seatRepository.findBySectionIdOrderByRowLabelAscSeatNumberAsc(tt.getSection().getId());
                int count = 0;
                for (Seat seat : sectionSeats) {
                    if (count >= tt.getQuota()) break;
                    inventories.add(new SeatInventory(session, tt, seat));
                    count++;
                }
            } else {
                // General Admission units (null seat)
                for (int i = 0; i < tt.getQuota(); i++) {
                    inventories.add(new SeatInventory(session, tt, null));
                }
            }
        }

        if (!inventories.isEmpty()) {
            inventoryRepository.saveAll(inventories);
        }
    }

    @Transactional
    public EventDetailDto publishEvent(UUID eventId, UUID organizerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        Organization org = event.getOrganization();
        if (org != null && !"VERIFIED".equalsIgnoreCase(org.getVerificationStatus())) {
            throw new BadRequestException("Organization verification required: Organization must be VERIFIED by platform administration before publishing live events. Current status is " + org.getVerificationStatus());
        }

        event.setStatus(EventStatus.PUBLISHED);
        return toDetailDto(eventRepository.save(event));
    }

    @Transactional
    public EventDetailDto cancelEvent(UUID eventId, String reason, UUID organizerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        event.setStatus(EventStatus.CANCELLED);
        event.setCancellationReason(reason);
        return toDetailDto(eventRepository.save(event));
    }

    @Transactional
    public EventDetailDto updateEvent(UUID eventId, com.eventpulse.events.dto.UpdateEventRequest request, UUID organizerUserId, boolean isPlatformAdmin) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (!isPlatformAdmin && organizerUserId != null) {
            UUID ownerId = event.getOrganization() != null && event.getOrganization().getOwner() != null
                    ? event.getOrganization().getOwner().getId()
                    : null;
            if (ownerId == null || !ownerId.equals(organizerUserId)) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to modify this event");
            }
        }

        long soldCount = ticketRepository.countByEventId(eventId);
        boolean hasSales = soldCount > 0;

        // If venue change requested
        if (request.venueId() != null && !request.venueId().equals(event.getVenue().getId())) {
            if (hasSales) {
                throw new com.eventpulse.common.exception.BadRequestException(
                        "Cannot change venue for an event with active bookings or sold tickets (" + soldCount + " tickets issued)."
                );
            }
            Venue newVenue = venueRepository.findById(request.venueId())
                    .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + request.venueId()));
            event.setVenue(newVenue);
        }

        // Update core fields
        event.setTitle(request.title().trim());
        event.setShortSummary(request.shortSummary().trim());
        event.setDescription(request.description().trim());
        event.setCategory(request.category());
        if (request.bannerUrl() != null) event.setBannerUrl(request.bannerUrl());
        if (request.thumbnailUrl() != null) event.setThumbnailUrl(request.thumbnailUrl());
        event.setFeatured(request.isFeatured());
        event.setRequiresVirtualQueue(request.requiresVirtualQueue());
        if (request.maxTicketsPerUser() > 0) event.setMaxTicketsPerUser(request.maxTicketsPerUser());
        if (request.ageRestriction() != null) event.setAgeRestriction(request.ageRestriction());
        if (request.ticketSaleStatus() != null) event.setTicketSaleStatus(request.ticketSaleStatus());
        if (request.officialInfoUrl() != null) event.setOfficialInfoUrl(request.officialInfoUrl());
        if (request.officialBookingUrl() != null) event.setOfficialBookingUrl(request.officialBookingUrl());
        event.setLastVerifiedAt(Instant.now());

        // Update sessions
        if (request.sessions() != null && !request.sessions().isEmpty()) {
            for (com.eventpulse.events.dto.UpdateEventRequest.UpdateSessionRequest sReq : request.sessions()) {
                if (sReq.id() != null) {
                    sessionRepository.findById(sReq.id()).ifPresent(session -> {
                        session.setSessionTitle(sReq.sessionTitle());
                        session.setDoorsOpenAt(sReq.doorsOpenAt());
                        session.setStartsAt(sReq.startsAt());
                        session.setEndsAt(sReq.endsAt());
                        sessionRepository.save(session);
                    });
                }
            }
        }

        // Update ticket types
        if (request.ticketTypes() != null && !request.ticketTypes().isEmpty()) {
            for (com.eventpulse.events.dto.UpdateEventRequest.UpdateTicketTypeRequest ttReq : request.ticketTypes()) {
                if (ttReq.id() != null) {
                    ticketTypeRepository.findById(ttReq.id()).ifPresent(tt -> {
                        tt.setName(ttReq.name());
                        tt.setDescription(ttReq.description());
                        if (!hasSales) {
                            tt.setBasePrice(ttReq.basePrice());
                            if (ttReq.serviceFee() != null) tt.setServiceFee(ttReq.serviceFee());
                            if (ttReq.taxAmount() != null) tt.setTaxAmount(ttReq.taxAmount());
                        }
                        if (ttReq.quota() > 0) tt.setQuota(ttReq.quota());
                        if (ttReq.salesEndAt() != null) tt.setSalesEndAt(ttReq.salesEndAt());
                        ticketTypeRepository.save(tt);
                    });
                } else {
                    VenueSection section = ttReq.sectionId() != null
                            ? sectionRepository.findById(ttReq.sectionId()).orElse(null)
                            : null;
                    Instant salesEnd = ttReq.salesEndAt() != null
                            ? ttReq.salesEndAt()
                            : (event.getSessions() != null && !event.getSessions().isEmpty()
                                ? event.getSessions().get(0).getStartsAt()
                                : Instant.now().plusSeconds(86400 * 30));
                    TicketType newTt = new TicketType(
                            event,
                            section,
                            ttReq.name(),
                            ttReq.basePrice(),
                            ttReq.serviceFee() != null ? ttReq.serviceFee() : BigDecimal.ZERO,
                            ttReq.taxAmount() != null ? ttReq.taxAmount() : BigDecimal.ZERO,
                            ttReq.quota() > 0 ? ttReq.quota() : 100,
                            salesEnd
                    );
                    newTt.setDescription(ttReq.description());
                    ticketTypeRepository.save(newTt);
                }
            }
        }

        event = eventRepository.save(event);
        return toDetailDto(event);
    }

    @Transactional
    public void deleteEvent(UUID eventId, UUID organizerUserId, boolean isPlatformAdmin) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (!isPlatformAdmin && organizerUserId != null) {
            UUID ownerId = event.getOrganization() != null && event.getOrganization().getOwner() != null
                    ? event.getOrganization().getOwner().getId()
                    : null;
            if (ownerId == null || !ownerId.equals(organizerUserId)) {
                throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete this event");
            }
        }

        long soldCount = ticketRepository.countByEventId(eventId);
        if (soldCount > 0) {
            throw new com.eventpulse.common.exception.BadRequestException(
                    "Cannot delete event with existing bookings or issued tickets (" + soldCount + " tickets issued). Cancel the event instead."
            );
        }

        eventRepository.delete(event);
    }

    public EventSummaryDto toSummaryDto(Event event) {
        BigDecimal startingPrice = BigDecimal.ZERO;
        if (event.getTicketTypes() != null && !event.getTicketTypes().isEmpty()) {
            startingPrice = event.getTicketTypes().stream()
                    .map(TicketType::getTotalPrice)
                    .min(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);
        }

        Instant nextStartsAt = null;
        if (event.getSessions() != null && !event.getSessions().isEmpty()) {
            nextStartsAt = event.getSessions().get(0).getStartsAt();
        }

        return new EventSummaryDto(
                event.getId(),
                event.getTitle(),
                event.getSlug(),
                event.getShortSummary(),
                event.getCategory(),
                event.getBannerUrl(),
                event.getThumbnailUrl(),
                event.getStatus(),
                event.isFeatured(),
                event.isRequiresVirtualQueue(),
                event.getVenue() != null ? event.getVenue().getName() : "Venue TBA",
                event.getVenue() != null ? event.getVenue().getCity() : "City TBA",
                startingPrice,
                "INR",
                nextStartsAt,
                event.getTicketSaleStatus() != null ? event.getTicketSaleStatus() : "EVENTPULSE_MANAGED",
                event.getOfficialInfoUrl(),
                event.getOfficialBookingUrl(),
                event.getImageSourceUrl(),
                event.getImageAttribution(),
                event.getVerificationStatus() != null ? event.getVerificationStatus() : "VERIFIED",
                event.getLastVerifiedAt()
        );
    }

    public EventDetailDto toDetailDto(Event event) {
        List<SessionDto> sessionDtos = event.getSessions().stream()
                .map(s -> new SessionDto(s.getId(), s.getSessionTitle(), s.getDoorsOpenAt(), s.getStartsAt(), s.getEndsAt()))
                .toList();

        List<TicketTypeDto> ttDtos = event.getTicketTypes().stream()
                .map(tt -> new TicketTypeDto(
                        tt.getId(),
                        tt.getName(),
                        tt.getDescription(),
                        tt.getBasePrice(),
                        tt.getServiceFee(),
                        tt.getTaxAmount(),
                        tt.getTotalPrice(),
                        tt.getCurrency(),
                        tt.getQuota(),
                        tt.getSoldCount(),
                        tt.getAvailableQuantity(),
                        tt.getSalesStartAt(),
                        tt.getSalesEndAt(),
                        tt.isActive(),
                        tt.getSection() != null ? tt.getSection().getId() : null,
                        tt.getSection() != null ? tt.getSection().getName() : null
                ))
                .toList();

        return new EventDetailDto(
                event.getId(),
                event.getTitle(),
                event.getSlug(),
                event.getShortSummary(),
                event.getDescription(),
                event.getCategory(),
                event.getBannerUrl(),
                event.getThumbnailUrl(),
                event.getStatus(),
                event.getAgeRestriction(),
                event.isFeatured(),
                event.isRequiresVirtualQueue(),
                event.getMaxTicketsPerUser(),
                event.getOrganization() != null ? event.getOrganization().getId() : null,
                event.getOrganization() != null ? event.getOrganization().getName() : null,
                event.getVenue() != null ? event.getVenue().getId() : null,
                event.getVenue() != null ? event.getVenue().getName() : null,
                event.getVenue() != null ? event.getVenue().getAddressLine1() : null,
                event.getVenue() != null ? event.getVenue().getCity() : null,
                event.getVenue() != null ? event.getVenue().getState() : null,
                event.getVenue() != null ? event.getVenue().getPostalCode() : null,
                event.getVenue() != null ? event.getVenue().getLatitude() : null,
                event.getVenue() != null ? event.getVenue().getLongitude() : null,
                event.getVenue() != null ? event.getVenue().getDirectionsUrl() : null,
                sessionDtos,
                ttDtos,
                event.getTicketSaleStatus() != null ? event.getTicketSaleStatus() : "EVENTPULSE_MANAGED",
                event.getOfficialInfoUrl(),
                event.getOfficialBookingUrl(),
                event.getImageSourceUrl(),
                event.getImageAttribution(),
                event.getVerificationStatus() != null ? event.getVerificationStatus() : "VERIFIED",
                event.getLastVerifiedAt()
        );
    }

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    public static String generateSlug(String input) {
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH);
    }
}
