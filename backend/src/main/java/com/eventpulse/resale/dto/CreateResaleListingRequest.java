package com.eventpulse.resale.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateResaleListingRequest(
        @NotNull(message = "Ticket ID is required")
        UUID ticketId,

        @NotNull(message = "Resale price is required")
        @DecimalMin(value = "1.00", message = "Resale price must be at least ₹1.00")
        BigDecimal resalePrice
) {}
