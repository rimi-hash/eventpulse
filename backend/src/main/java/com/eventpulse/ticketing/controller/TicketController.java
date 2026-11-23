package com.eventpulse.ticketing.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.ticketing.dto.TicketDto;
import com.eventpulse.ticketing.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tickets")
@Tag(name = "Digital Tickets & Transfers", description = "Cryptographic digital passes, ticket wallet, and ownership transfers")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @GetMapping("/my")
    @Operation(summary = "Get current user's digital tickets")
    public ResponseEntity<ApiResponse<List<TicketDto>>> getMyTickets(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<TicketDto> tickets = ticketService.getMyTickets(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Tickets retrieved successfully", tickets));
    }

    @GetMapping("/{ticketId}")
    @Operation(summary = "Get digital pass details by ticket ID")
    public ResponseEntity<ApiResponse<TicketDto>> getTicket(
            @PathVariable UUID ticketId,
            @AuthenticationPrincipal UserPrincipal principal) {
        TicketDto ticket = ticketService.getTicket(ticketId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Ticket retrieved successfully", ticket));
    }

    @PostMapping("/{ticketId}/transfer")
    @Operation(summary = "Transfer ticket to another registered user")
    public ResponseEntity<ApiResponse<TicketDto>> transferTicket(
            @PathVariable UUID ticketId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String recipientEmail = body.get("recipientEmail");
        TicketDto transferred = ticketService.transferTicket(ticketId, recipientEmail, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Ticket transferred successfully", transferred));
    }
}
