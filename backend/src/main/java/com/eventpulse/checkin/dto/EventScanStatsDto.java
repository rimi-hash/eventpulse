package com.eventpulse.checkin.dto;

import java.util.UUID;

public record EventScanStatsDto(
        UUID eventId,
        String eventTitle,
        long totalIssued,
        long totalCheckedIn,
        double checkinPercentage,
        long alreadyUsedAttempts
) {}
