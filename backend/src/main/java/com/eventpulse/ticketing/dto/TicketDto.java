package com.eventpulse.ticketing.dto;

import com.eventpulse.ticketing.model.TicketStatus;

import java.time.Instant;
import java.util.UUID;

public record TicketDto(
        UUID id,
        String ticketNumber,
        UUID orderId,
        String orderNumber,
        UUID eventId,
        String eventTitle,
        String eventBannerUrl,
        UUID sessionId,
        String sessionTitle,
        Instant sessionStartsAt,
        String venueName,
        String venueCity,
        String ticketTypeName,
        String seatLabel,
        TicketStatus status,
        String attendeeName,
        String attendeeEmail,
        String qrCryptographicPayload,
        java.math.BigDecimal originalPrice,
        Instant createdAt
) {}
