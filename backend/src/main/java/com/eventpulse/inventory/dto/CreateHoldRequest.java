package com.eventpulse.inventory.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CreateHoldRequest(
        @NotNull(message = "Ticket type ID is required")
        UUID ticketTypeId,

        List<UUID> seatIds,

        Integer quantity,

        Integer holdDurationSeconds
) {}
