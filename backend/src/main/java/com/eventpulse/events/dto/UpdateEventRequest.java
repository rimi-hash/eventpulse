package com.eventpulse.events.dto;

import com.eventpulse.events.model.EventCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UpdateEventRequest(
        @NotBlank(message = "Title is required")
        String title,

        @NotBlank(message = "Short summary is required")
        String shortSummary,

        @NotBlank(message = "Description is required")
        String description,

        @NotNull(message = "Category is required")
        EventCategory category,

        String bannerUrl,
        String thumbnailUrl,

        UUID venueId,

        boolean isFeatured,
        boolean requiresVirtualQueue,
        int maxTicketsPerUser,

        String ageRestriction,
        String refundPolicy,
        String ticketSaleStatus,
        String officialInfoUrl,
        String officialBookingUrl,

        List<UpdateSessionRequest> sessions,
        List<UpdateTicketTypeRequest> ticketTypes
) {
    public record UpdateSessionRequest(
            UUID id,
            @NotBlank String sessionTitle,
            @NotNull Instant doorsOpenAt,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt
    ) {}

    public record UpdateTicketTypeRequest(
            UUID id,
            @NotBlank String name,
            String description,
            @NotNull BigDecimal basePrice,
            BigDecimal serviceFee,
            BigDecimal taxAmount,
            int quota,
            UUID sectionId,
            Instant salesEndAt
    ) {}
}
