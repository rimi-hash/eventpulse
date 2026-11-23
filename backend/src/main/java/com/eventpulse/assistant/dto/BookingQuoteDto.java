package com.eventpulse.assistant.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Authoritative backend booking quote.
 * Never computed by AI arithmetic; calculated from trusted domain models.
 */
public record BookingQuoteDto(
        UUID eventId,
        String eventTitle,
        String venueName,
        UUID sessionId,
        UUID ticketTypeId,
        String ticketTierName,
        List<UUID> seatIds,
        List<String> seatLabels,
        String sectionName,
        int quantity,
        BigDecimal unitBasePrice,
        BigDecimal subtotal,
        BigDecimal serviceFee,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String currency
) {}
