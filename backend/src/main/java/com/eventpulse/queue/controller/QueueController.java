package com.eventpulse.queue.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.queue.dto.QueueResponseDto;
import com.eventpulse.queue.service.QueueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/queue/{eventId}")
@Tag(name = "High-Demand Virtual Queue", description = "Traffic governor and virtual waiting room for high-demand ticket drops")
public class QueueController {

    @Autowired
    private QueueService queueService;

    @PostMapping("/join")
    @Operation(summary = "Join event virtual waiting room")
    public ResponseEntity<ApiResponse<QueueResponseDto>> joinQueue(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        QueueResponseDto queue = queueService.joinQueue(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Joined virtual queue", queue));
    }

    @GetMapping("/status")
    @Operation(summary = "Check virtual queue status and position")
    public ResponseEntity<ApiResponse<QueueResponseDto>> getQueueStatus(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        QueueResponseDto status = queueService.getQueueStatus(eventId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Queue status retrieved", status));
    }
}
