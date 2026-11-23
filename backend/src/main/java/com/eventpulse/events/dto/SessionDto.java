package com.eventpulse.events.dto;

import java.time.Instant;
import java.util.UUID;

public record SessionDto(
        UUID id,
        String sessionTitle,
        Instant doorsOpenAt,
        Instant startsAt,
        Instant endsAt
) {}
