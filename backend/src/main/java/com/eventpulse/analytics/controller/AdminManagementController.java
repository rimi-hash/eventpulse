package com.eventpulse.analytics.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.events.dto.EventDetailDto;
import com.eventpulse.events.dto.EventSummaryDto;
import com.eventpulse.events.dto.UpdateEventRequest;
import com.eventpulse.events.model.Event;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.events.service.EventService;
import com.eventpulse.orders.repository.OrderRepository;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.users.dto.AdminUserDto;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin Operations & Governance", description = "Endpoints for platform administrators to manage events, users, and platform resources")
public class AdminManagementController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventService eventService;

    // --- User Management Endpoints ---

    @GetMapping("/users")
    @Operation(summary = "Get all platform users for administration")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> getAllUsers() {
        List<AdminUserDto> users = userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(AdminUserDto::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Users retrieved successfully", users));
    }

    @PutMapping("/users/{id}/toggle-status")
    @Operation(summary = "Toggle user active state")
    @Transactional
    public ResponseEntity<ApiResponse<AdminUserDto>> toggleUserStatus(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && id.equals(principal.getId())) {
            throw new BadRequestException("Cannot toggle active status of the currently logged-in administrator.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        String msg = saved.isActive() ? "User account activated successfully" : "User account deactivated successfully";
        return ResponseEntity.ok(ApiResponse.ok(msg, AdminUserDto.from(saved)));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Remove or permanently deactivate a user")
    @Transactional
    public ResponseEntity<ApiResponse<String>> removeUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && id.equals(principal.getId())) {
            throw new BadRequestException("Cannot delete the currently authenticated platform administrator account.");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        long ordersCount = orderRepository.findByUserIdOrderByCreatedAtDesc(id).size();
        long ticketsCount = ticketRepository.findByCurrentOwnerIdOrderByCreatedAtDesc(id).size();

        if (ordersCount > 0 || ticketsCount > 0) {
            // Relational integrity preservation: Deactivate account and scrub identity
            user.setActive(false);
            user.setFullName("[Removed User]");
            String scrubbedEmail = "removed_" + user.getId().toString().substring(0, 8) + "@archived.local";
            user.setEmail(scrubbedEmail);
            user.setUsername("removed_" + user.getId().toString().substring(0, 8));
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.ok("User account deactivated and personal credentials scrubbed (historical financial order ledger preserved).", scrubbedEmail));
        } else {
            // Hard delete cleanly
            userRepository.delete(user);
            return ResponseEntity.ok(ApiResponse.ok("User account permanently removed from platform.", null));
        }
    }

    // --- Event Management Endpoints ---

    @GetMapping("/events")
    @Operation(summary = "Get all events across platform for administration")
    public ResponseEntity<ApiResponse<List<EventSummaryDto>>> getAllEvents() {
        List<EventSummaryDto> events = eventRepository.findAll().stream()
                .sorted(Comparator.comparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(eventService::toSummaryDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Events retrieved successfully", events));
    }

    @GetMapping("/events/{id}")
    @Operation(summary = "Get single event details for editing")
    public ResponseEntity<ApiResponse<EventDetailDto>> getEventDetails(@PathVariable UUID id) {
        EventDetailDto detail = eventService.getEventByIdOrSlug(id.toString());
        return ResponseEntity.ok(ApiResponse.ok("Event details retrieved", detail));
    }

    @PutMapping("/events/{id}")
    @Operation(summary = "Admin edit event parameters (title, banner, description, category, etc.)")
    public ResponseEntity<ApiResponse<EventDetailDto>> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEventRequest request) {
        EventDetailDto updated = eventService.updateEvent(id, request, null, true);
        return ResponseEntity.ok(ApiResponse.ok("Event updated successfully by platform administrator", updated));
    }

    @DeleteMapping("/events/{id}")
    @Operation(summary = "Admin delete event")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable UUID id) {
        eventService.deleteEvent(id, null, true);
        return ResponseEntity.ok(ApiResponse.ok("Event deleted successfully by platform administrator", null));
    }
}
