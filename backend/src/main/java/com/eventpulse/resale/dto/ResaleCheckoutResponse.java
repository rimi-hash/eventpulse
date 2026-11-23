package com.eventpulse.resale.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ResaleCheckoutResponse(
        UUID listingId,
        String eventTitle,
        String sessionTitle,
        String seatLabel,
        String ticketTypeName,
        BigDecimal originalPrice,
        BigDecimal resalePrice,
        BigDecimal processingFee,
        BigDecimal totalAmount,
        String currency,
        String razorpayOrderId,
        String razorpayKeyId,
        Instant holdExpiresAt
) {}
