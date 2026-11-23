package com.eventpulse.checkin.dto;

import com.eventpulse.checkin.model.CheckinScanResult;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

public record ValidateTicketRequest(
        @NotBlank(message = "Ticket code or QR payload is required")
        String ticketCodeOrQrPayload,

        String gateName,
        String deviceInfo
) {}
