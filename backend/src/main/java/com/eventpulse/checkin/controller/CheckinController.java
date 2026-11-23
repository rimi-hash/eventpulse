package com.eventpulse.checkin.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.checkin.dto.CheckinResultDto;
import com.eventpulse.checkin.dto.EventScanStatsDto;
import com.eventpulse.checkin.dto.ValidateTicketRequest;
import com.eventpulse.checkin.service.CheckinService;
import com.eventpulse.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/checkin")
@Tag(name = "Gate Check-In & Field Operations", description = "Ticket scanner verification, duplicate redemption prevention, and real-time gate telemetry")
public class CheckinController {

    @Autowired
    private CheckinService checkinService;

    @PostMapping("/validate")
    @Operation(summary = "Validate scanned ticket or QR code", description = "Verifies pass authenticity and checks for duplicate use under 150ms")
    public ResponseEntity<ApiResponse<CheckinResultDto>> validateTicket(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ValidateTicketRequest request
    ) {
        CheckinResultDto result = checkinService.validateTicket(request, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Scan processed", result));
    }

    @GetMapping("/stats/{eventId}")
    @Operation(summary = "Get live check-in telemetry for event")
    public ResponseEntity<ApiResponse<EventScanStatsDto>> getScanStats(@PathVariable UUID eventId) {
        EventScanStatsDto stats = checkinService.getScanStats(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Scan stats retrieved", stats));
    }

    @GetMapping("/logs/{eventId}")
    @Operation(summary = "Get recent check-in audit logs for event")
    public ResponseEntity<ApiResponse<java.util.List<com.eventpulse.checkin.dto.CheckinLogDto>>> getRecentLogs(@PathVariable UUID eventId) {
        java.util.List<com.eventpulse.checkin.dto.CheckinLogDto> logs = checkinService.getRecentLogs(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Check-in logs retrieved", logs));
    }

    @GetMapping("/events")
    @Operation(summary = "Get all events assigned for gate check-in")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getAssignedEvents() {
        java.util.List<com.eventpulse.events.model.Event> events = checkinService.getCheckinEvents();
        java.util.List<java.util.Map<String, Object>> dtos = events.stream().map(e -> {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", e.getId());
            m.put("title", e.getTitle());
            m.put("status", e.getStatus().name());
            m.put("venueName", e.getVenue() != null ? e.getVenue().getName() : "Main Venue");
            m.put("city", e.getVenue() != null ? e.getVenue().getCity() : "");
            return m;
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok("Assigned events retrieved", dtos));
    }
}
