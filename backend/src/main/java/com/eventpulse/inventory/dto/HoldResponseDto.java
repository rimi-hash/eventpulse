package com.eventpulse.inventory.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HoldResponseDto(
        String holdSessionToken,
        Instant expiresAt,
        long remainingSeconds,
        List<HeldSeatDto> heldSeats,
        BigDecimal subtotal,
        BigDecimal estimatedFees,
        BigDecimal estimatedTaxes,
        BigDecimal estimatedTotal,
        String currency
) {
    public record HeldSeatDto(
            UUID inventoryId,
            UUID seatId,
            String label,
            BigDecimal price
    ) {}
}
