package com.eventpulse.inventory.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.inventory.dto.CreateHoldRequest;
import com.eventpulse.inventory.dto.HoldResponseDto;
import com.eventpulse.inventory.dto.SeatAvailabilityDto;
import com.eventpulse.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@Tag(name = "Seat Inventory & Holds", description = "Real-time seat matrix, atomic temporary reservation holds, and hold releases")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping({
            "/api/v1/events/{eventId}/sessions/{sessionId}/availability",
            "/api/v1/inventory/sessions/{sessionId}/availability"
    })
    @Operation(summary = "Real-time seat availability matrix", description = "Returns status of all seats and admission quotas for a session")
    public ResponseEntity<ApiResponse<List<SeatAvailabilityDto>>> getAvailability(
            @PathVariable(required = false) UUID eventId,
            @PathVariable UUID sessionId
    ) {
        List<SeatAvailabilityDto> availability = inventoryService.getAvailability(sessionId);
        return ResponseEntity.ok(ApiResponse.ok("Session seat availability retrieved", availability));
    }

    @PostMapping({
            "/api/v1/events/{eventId}/sessions/{sessionId}/holds",
            "/api/v1/events/{eventId}/sessions/{sessionId}/hold",
            "/api/v1/inventory/sessions/{sessionId}/holds",
            "/api/v1/inventory/sessions/{sessionId}/hold"
    })
    @Operation(summary = "Acquire temporary hold on seats", description = "Ephemerally holds seats for 8 minutes to prevent race conditions during checkout")
    public ResponseEntity<ApiResponse<HoldResponseDto>> createHold(
            @PathVariable(required = false) UUID eventId,
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateHoldRequest request
    ) {
        HoldResponseDto hold = inventoryService.createHold(eventId, sessionId, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Seat hold acquired successfully", hold));
    }

    @DeleteMapping({
            "/api/v1/events/{eventId}/sessions/{sessionId}/holds",
            "/api/v1/events/{eventId}/sessions/{sessionId}/hold",
            "/api/v1/events/{eventId}/sessions/{sessionId}/holds/{token}",
            "/api/v1/inventory/sessions/{sessionId}/holds",
            "/api/v1/inventory/sessions/{sessionId}/hold",
            "/api/v1/inventory/sessions/{sessionId}/holds/{token}"
    })
    @Operation(summary = "Release active seat hold", description = "Manually unlocks held inventory if customer abandons or navigates away")
    public ResponseEntity<ApiResponse<Void>> releaseHold(
            @PathVariable(required = false) UUID eventId,
            @PathVariable UUID sessionId,
            @PathVariable(value = "token", required = false) String pathToken,
            @RequestParam(required = false) String holdToken,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveToken = pathToken != null ? pathToken : holdToken;
        if (effectiveToken != null) {
            inventoryService.releaseHold(effectiveToken, principal.getId());
        }
        return ResponseEntity.ok(ApiResponse.ok("Hold released successfully", null));
    }

    @GetMapping({
            "/api/v1/events/{eventId}/sessions/{sessionId}/holds/active",
            "/api/v1/inventory/sessions/{sessionId}/holds/active"
    })
    @Operation(summary = "Get user's current active hold", description = "Retrieves active countdown and held seats if session exists")
    public ResponseEntity<ApiResponse<HoldResponseDto>> getActiveHold(
            @PathVariable(required = false) UUID eventId,
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        HoldResponseDto activeHold = inventoryService.getActiveHold(sessionId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Active hold retrieved", activeHold));
    }
}
