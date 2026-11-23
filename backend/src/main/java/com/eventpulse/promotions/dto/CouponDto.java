package com.eventpulse.promotions.dto;

import com.eventpulse.promotions.model.Coupon;
import com.eventpulse.promotions.model.DiscountType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CouponDto(
        UUID id,
        String code,
        String description,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minOrderValue,
        BigDecimal maxDiscountCap,
        Integer maxRedemptions,
        int redemptionCount,
        int maxPerCustomer,
        Instant startsAt,
        Instant expiresAt,
        boolean isActive,
        UUID eventId,
        String eventTitle,
        String statusLabel,
        Instant createdAt
) {
    public static CouponDto from(Coupon coupon) {
        return from(coupon, null);
    }

    public static CouponDto from(Coupon coupon, String eventTitle) {
        if (coupon == null) return null;
        Instant now = Instant.now();
        String statusLabel = "ACTIVE";
        if (!coupon.isActive()) {
            statusLabel = "DISABLED";
        } else if (coupon.getStartsAt() != null && coupon.getStartsAt().isAfter(now)) {
            statusLabel = "SCHEDULED";
        } else if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(now)) {
            statusLabel = "EXPIRED";
        } else if (coupon.getMaxRedemptions() != null && coupon.getRedemptionCount() >= coupon.getMaxRedemptions()) {
            statusLabel = "DEPLETED";
        }

        return new CouponDto(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDescription(),
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMinOrderValue(),
                coupon.getMaxDiscountCap(),
                coupon.getMaxRedemptions(),
                coupon.getRedemptionCount(),
                coupon.getMaxPerCustomer(),
                coupon.getStartsAt(),
                coupon.getExpiresAt(),
                coupon.isActive(),
                coupon.getEventId(),
                eventTitle,
                statusLabel,
                coupon.getCreatedAt()
        );
    }
}
