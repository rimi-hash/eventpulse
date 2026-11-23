package com.eventpulse.checkin.dto;

import com.eventpulse.checkin.model.CheckinScanResult;
import java.time.Instant;
import java.util.UUID;

public record CheckinLogDto(
        UUID id,
        String ticketNumber,
        String attendeeName,
        String seatLabel,
        String gateName,
        String staffName,
        CheckinScanResult scanResult,
        Instant scanTimestamp
) {}
