package com.eventpulse.promotions.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.promotions.dto.CouponDto;
import com.eventpulse.promotions.dto.CouponValidationResultDto;
import com.eventpulse.promotions.dto.CreateCouponRequest;
import com.eventpulse.promotions.dto.ValidateCouponRequest;
import com.eventpulse.promotions.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Coupons & Promotional Discounts", description = "Endpoints for managing organizer promo campaigns and validating checkout coupons")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @PostMapping("/orders/validate-coupon")
    @Operation(summary = "Validate coupon and calculate checkout discount preview")
    public ResponseEntity<ApiResponse<CouponValidationResultDto>> validateCoupon(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ValidateCouponRequest request) {
        CouponValidationResultDto result = couponService.validateCoupon(request, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Coupon evaluated", result));
    }

    @GetMapping("/organizer/coupons")
    @Operation(summary = "Get all coupons managed by organizer")
    public ResponseEntity<ApiResponse<List<CouponDto>>> getOrganizerCoupons(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<CouponDto> coupons = couponService.getOrganizerCoupons(principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Coupons retrieved", coupons));
    }

    @PostMapping("/organizer/coupons")
    @Operation(summary = "Create a new promotional discount coupon")
    public ResponseEntity<ApiResponse<CouponDto>> createCoupon(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateCouponRequest request) {
        CouponDto created = couponService.createCoupon(principal != null ? principal.getId() : null, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Coupon created successfully", created));
    }

    @PutMapping("/organizer/coupons/{id}/status")
    @Operation(summary = "Toggle coupon activation status")
    public ResponseEntity<ApiResponse<CouponDto>> toggleStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body) {
        boolean active = body.getOrDefault("active", true);
        CouponDto updated = couponService.toggleCouponStatus(id, active);
        return ResponseEntity.ok(ApiResponse.ok("Coupon status updated", updated));
    }
}
