package com.eventpulse.checkin.dto;

import com.eventpulse.checkin.model.CheckinScanResult;

import java.time.Instant;
import java.util.UUID;

public record CheckinResultDto(
        CheckinScanResult scanResult,
        UUID ticketId,
        String ticketNumber,
        String eventTitle,
        String sessionTitle,
        String attendeeName,
        String seatLabel,
        String gateName,
        Instant scannedAt,
        String message,
        FirstScanDetails firstScanDetails
) {
    public record FirstScanDetails(
            Instant scannedAt,
            String gateName,
            String staffName
    ) {}
}
