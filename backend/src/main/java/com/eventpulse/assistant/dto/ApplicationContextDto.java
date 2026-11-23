package com.eventpulse.assistant.dto;

import java.util.List;
import java.util.UUID;

/**
 * Rich, typed application context forwarded from the frontend.
 * Provides the active route, selected event, venue, active section,
 * selected seats, ticket tier, quantity, and checkout state.
 */
public record ApplicationContextDto(
        String currentPath,
        String pageType,             // EXPLORE, EVENT_DETAIL, CHECKOUT, ORDER_CONFIRMATION, MY_TICKETS, MY_ORDERS, ORGANIZER, RESALE, VENUE_STUDIO, SCANNER
        UUID eventId,
        String eventSlug,
        String eventTitle,
        UUID sessionId,
        UUID venueId,
        String venueName,
        String activeSection,
        UUID selectedTicketTypeId,
        String selectedTicketTierName,
        List<UUID> selectedSeatIds,
        List<String> selectedSeatLabels,
        Integer quantity,
        UUID orderId,
        String checkoutStage,
        Boolean isAuthenticated,
        String userRole
) {
    public static ApplicationContextDto empty() {
        return new ApplicationContextDto(
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                false, null
        );
    }
}
