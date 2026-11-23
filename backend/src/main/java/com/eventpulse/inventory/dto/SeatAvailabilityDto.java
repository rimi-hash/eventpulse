package com.eventpulse.inventory.dto;

import com.eventpulse.inventory.model.InventoryStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record SeatAvailabilityDto(
        UUID inventoryId,
        UUID ticketTypeId,
        String ticketTypeName,
        BigDecimal price,
        UUID seatId,
        String rowLabel,
        String seatNumber,
        String sectionName,
        boolean isGeneralAdmission,
        InventoryStatus status,
        Integer gridX,
        Integer gridY
) {}
