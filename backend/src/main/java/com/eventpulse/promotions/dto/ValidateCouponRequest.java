package com.eventpulse.promotions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ValidateCouponRequest(
        @NotBlank(message = "Coupon code is required")
        String couponCode,

        UUID eventId,

        @NotNull(message = "Subtotal amount is required")
        BigDecimal subtotalAmount
) {}
