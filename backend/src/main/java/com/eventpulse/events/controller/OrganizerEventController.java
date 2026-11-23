package com.eventpulse.events.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.events.dto.CreateEventRequest;
import com.eventpulse.events.dto.EventDetailDto;
import com.eventpulse.events.dto.EventSummaryDto;
import com.eventpulse.events.service.EventService;
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
@RequestMapping("/api/v1/organizer/events")
@Tag(name = "Organizer Event Management", description = "Endpoints for organizers to create, manage, publish, and cancel events")
public class OrganizerEventController {

    @Autowired
    private EventService eventService;

    @GetMapping
    @Operation(summary = "Get all events for organizer dashboard")
    public ResponseEntity<ApiResponse<List<EventSummaryDto>>> getOrganizerEvents(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<EventSummaryDto> events = eventService.getOrganizerEvents(principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Organizer events retrieved", events));
    }

    @PostMapping
    @Operation(summary = "Create and draft new event")
    public ResponseEntity<ApiResponse<EventDetailDto>> createEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateEventRequest request) {
        EventDetailDto created = eventService.createEvent(request, principal != null ? principal.getId() : null);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Event created successfully", created));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish event live")
    public ResponseEntity<ApiResponse<EventDetailDto>> publishEvent(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        EventDetailDto published = eventService.publishEvent(id, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Event published successfully", published));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update event details, ticketing, and policies")
    public ResponseEntity<ApiResponse<EventDetailDto>> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody com.eventpulse.events.dto.UpdateEventRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = principal != null && principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_ADMIN"));
        EventDetailDto updated = eventService.updateEvent(id, request, principal != null ? principal.getId() : null, isAdmin);
        return ResponseEntity.ok(ApiResponse.ok("Event updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an event draft without active sales")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = principal != null && principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_ADMIN"));
        eventService.deleteEvent(id, principal != null ? principal.getId() : null, isAdmin);
        return ResponseEntity.ok(ApiResponse.ok("Event deleted successfully", null));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel event and record cancellation reason")
    public ResponseEntity<ApiResponse<EventDetailDto>> cancelEvent(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String reason = body.getOrDefault("reason", "Cancelled by event organizer");
        EventDetailDto cancelled = eventService.cancelEvent(id, reason, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok("Event cancelled successfully", cancelled));
    }
}
