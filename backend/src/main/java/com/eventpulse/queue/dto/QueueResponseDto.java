package com.eventpulse.queue.dto;

import java.time.Instant;
import java.util.UUID;

public record QueueResponseDto(
        UUID eventId,
        UUID userId,
        String sessionToken,
        int position,
        int estimatedWaitSeconds,
        String status, // WAITING, ADMITTED, EXPIRED
        String admissionToken,
        Instant expiresAt
) {}
