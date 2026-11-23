package com.eventpulse.events.dto;

import com.eventpulse.events.model.EventCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateEventRequest(
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

        @NotNull(message = "Venue ID is required")
        UUID venueId,

        boolean isFeatured,
        boolean requiresVirtualQueue,
        int maxTicketsPerUser,

        List<CreateSessionRequest> sessions,
        List<CreateTicketTypeRequest> ticketTypes
) {
    public record CreateSessionRequest(
            @NotBlank String sessionTitle,
            @NotNull Instant doorsOpenAt,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt
    ) {}

    public record CreateTicketTypeRequest(
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
