package com.eventpulse.resale.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.resale.dto.CreateResaleListingRequest;
import com.eventpulse.resale.dto.ResaleListingDto;
import com.eventpulse.resale.service.ResaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/resale")
@Tag(name = "Customer Ticket Marketplace & Resale", description = "Anti-scalping fan-to-fan verified secondary ticket exchange")
public class ResaleController {

    @Autowired
    private ResaleService resaleService;

    @PostMapping("/list")
    @Operation(summary = "List verified ticket for resale", description = "Validates ticket ownership, enforces resalePrice < originalPrice rule, and publishes listing")
    public ResponseEntity<ApiResponse<ResaleListingDto>> createListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateResaleListingRequest request) {
        if (principal == null) throw new UnauthorizedException("Authentication required to list resale tickets");
        ResaleListingDto listing = resaleService.createListing(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Ticket listed on verified marketplace successfully", listing));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Withdraw resale listing", description = "Cancels active resale listing and restores full ticket control to seller")
    public ResponseEntity<ApiResponse<ResaleListingDto>> cancelListing(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Authentication required to cancel listing");
        ResaleListingDto listing = resaleService.cancelListing(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Resale listing withdrawn successfully", listing));
    }

    @GetMapping("/event/{eventId}")
    @Operation(summary = "Browse active verified resale listings for an event")
    public ResponseEntity<ApiResponse<List<ResaleListingDto>>> getEventResaleListings(@PathVariable UUID eventId) {
        List<ResaleListingDto> listings = resaleService.getEventResaleListings(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Event resale listings retrieved", listings));
    }

    @GetMapping("/my")
    @Operation(summary = "Get current customer's resale listings")
    public ResponseEntity<ApiResponse<List<ResaleListingDto>>> getMyListings(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Authentication required to view your resale listings");
        List<ResaleListingDto> listings = resaleService.getMyListings(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("My resale listings retrieved", listings));
    }

    @GetMapping("/marketplace")
    @Operation(summary = "Browse all active verified resale listings across the platform")
    public ResponseEntity<ApiResponse<List<ResaleListingDto>>> getMarketplaceListings() {
        List<ResaleListingDto> listings = resaleService.getAllActiveListings();
        return ResponseEntity.ok(ApiResponse.ok("Marketplace resale listings retrieved", listings));
    }

    @PostMapping("/{id}/checkout")
    @Operation(summary = "Initiate resale purchase checkout", description = "Places a 10-minute hold on the listing and prepares payment intent")
    public ResponseEntity<ApiResponse<com.eventpulse.resale.dto.ResaleCheckoutResponse>> initiateCheckout(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Authentication required to checkout resale ticket");
        com.eventpulse.resale.dto.ResaleCheckoutResponse response = resaleService.initiateResaleCheckout(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Resale checkout initiated", response));
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Confirm resale purchase and execute atomic transfer", description = "Verifies payment, rotates QR security credential, and transfers ticket ownership")
    public ResponseEntity<ApiResponse<ResaleListingDto>> confirmPurchase(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) com.eventpulse.resale.dto.ResaleConfirmPaymentRequest request) {
        if (principal == null) throw new UnauthorizedException("Authentication required to confirm purchase");
        ResaleListingDto listing = resaleService.confirmResalePurchase(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Resale ticket purchased successfully! New QR credential issued.", listing));
    }

    @PostMapping("/{id}/cancel-checkout")
    @Operation(summary = "Cancel resale purchase checkout and release hold")
    public ResponseEntity<ApiResponse<ResaleListingDto>> cancelCheckout(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Authentication required to cancel checkout");
        ResaleListingDto listing = resaleService.cancelResaleCheckout(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Resale checkout hold released", listing));
    }

    @PostMapping("/{id}/purchase")
    @Operation(summary = "Purchase resale ticket (direct)", description = "Executes atomic transfer of ownership, invalidates old QR pass, and rotates security credential to buyer")
    public ResponseEntity<ApiResponse<ResaleListingDto>> purchaseListing(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Authentication required to purchase resale ticket");
        ResaleListingDto listing = resaleService.purchaseResaleListing(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Resale ticket purchased successfully! New QR credential issued.", listing));
    }
}
