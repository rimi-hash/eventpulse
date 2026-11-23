package com.eventpulse.venues.dto;

import java.util.List;
import java.util.UUID;

public record VenueDto(
        UUID id,
        String name,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String country,
        String postalCode,
        int totalCapacity,
        String layoutType,
        Double latitude,
        Double longitude,
        String directionsUrl,
        String mapProvider,
        String layoutJson,
        int layoutVersion,
        String status,
        List<VenueSectionDto> sections
) {
    public record VenueSectionDto(
            UUID id,
            String name,
            String sectionCode,
            int capacity,
            boolean isGeneralAdmission,
            int displayOrder,
            String shapeType,
            String transformJson,
            String pricingTier,
            java.math.BigDecimal basePrice,
            List<SeatDto> seats
    ) {}

    public record SeatDto(
            UUID id,
            UUID sectionId,
            String rowLabel,
            String seatNumber,
            boolean isAccessible,
            boolean isCompanion,
            Integer gridX,
            Integer gridY,
            Double coordX,
            Double coordY,
            Double rotation,
            String tier,
            java.math.BigDecimal overridePrice,
            boolean isBlocked,
            boolean isRestrictedView
    ) {}
}
