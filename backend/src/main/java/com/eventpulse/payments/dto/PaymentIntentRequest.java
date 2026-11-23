package com.eventpulse.payments.dto;

import com.eventpulse.payments.model.PaymentProvider;
import com.eventpulse.payments.model.PaymentStatus;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentIntentRequest(
        @NotNull(message = "Order ID is required")
        UUID orderId,

        PaymentProvider provider,
        String paymentMethod
) {}
