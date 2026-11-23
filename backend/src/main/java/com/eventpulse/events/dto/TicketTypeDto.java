package com.eventpulse.events.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TicketTypeDto(
        UUID id,
        String name,
        String description,
        BigDecimal basePrice,
        BigDecimal serviceFee,
        BigDecimal taxAmount,
        BigDecimal totalPrice,
        String currency,
        int quota,
        int soldCount,
        int availableQuantity,
        Instant salesStartAt,
        Instant salesEndAt,
        boolean isActive,
        UUID sectionId,
        String sectionName
) {}
