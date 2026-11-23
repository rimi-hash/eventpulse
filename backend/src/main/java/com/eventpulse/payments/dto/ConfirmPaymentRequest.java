package com.eventpulse.payments.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ConfirmPaymentRequest(
        @NotNull(message = "Payment ID is required")
        UUID paymentId,

        boolean simulateFailure,
        String failureReason
) {}
