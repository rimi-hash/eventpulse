package com.eventpulse.promotions.dto;

import java.math.BigDecimal;

public record CouponValidationResultDto(
        boolean valid,
        String message,
        String couponCode,
        BigDecimal discountAmount,
        BigDecimal adjustedSubtotal
) {
    public static CouponValidationResultDto success(String code, BigDecimal discount, BigDecimal adjusted) {
        return new CouponValidationResultDto(true, "Coupon applied successfully", code, discount, adjusted);
    }

    public static CouponValidationResultDto failed(String message) {
        return new CouponValidationResultDto(false, message, null, BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
