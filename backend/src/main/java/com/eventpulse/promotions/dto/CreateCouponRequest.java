package com.eventpulse.promotions.dto;

import com.eventpulse.promotions.model.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateCouponRequest(
        @NotBlank(message = "Coupon code is required")
        @Size(min = 3, max = 32, message = "Coupon code must be between 3 and 32 characters")
        String code,

        String description,

        @NotNull(message = "Discount type is required")
        DiscountType discountType,

        @NotNull(message = "Discount value is required")
        @DecimalMin(value = "0.01", message = "Discount value must be greater than zero")
        BigDecimal discountValue,

        BigDecimal minOrderValue,

        BigDecimal maxDiscountCap,

        Integer maxRedemptions,

        Integer maxPerCustomer,

        Instant startsAt,

        Instant expiresAt,

        UUID eventId
) {}
