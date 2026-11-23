package com.eventpulse.venues.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateVenueRequest(
        @NotBlank(message = "Venue name is required")
        String name,

        @NotBlank(message = "Address is required")
        String addressLine1,

        String addressLine2,

        @NotBlank(message = "City is required")
        String city,

        @NotBlank(message = "State is required")
        String state,

        @NotBlank(message = "Country is required")
        String country,

        @NotBlank(message = "Postal code is required")
        String postalCode,

        int totalCapacity,

        String layoutType, // RESERVED, GENERAL_ADMISSION, AUDITORIUM, STADIUM, TABLES, HYBRID

        Double latitude,

        Double longitude,

        String layoutJson,

        Integer layoutVersion,

        String status,

        List<CreateSectionRequest> sections
) {
    public record CreateSectionRequest(
            @NotBlank String name,
            @NotBlank String sectionCode,
            int capacity,
            boolean isGeneralAdmission,
            int displayOrder,
            String shapeType,
            String transformJson,
            String pricingTier,
            java.math.BigDecimal basePrice,
            List<CreateSeatRequest> seats
    ) {}

    public record CreateSeatRequest(
            @NotBlank String rowLabel,
            @NotBlank String seatNumber,
            boolean isAccessible,
            boolean isCompanion,
            Integer gridX,
            Integer gridY,
            Double coordX,
            Double coordY,
            Double rotation,
            String tier,
            java.math.BigDecimal overridePrice,
            Boolean isBlocked,
            Boolean isRestrictedView
    ) {}
}
