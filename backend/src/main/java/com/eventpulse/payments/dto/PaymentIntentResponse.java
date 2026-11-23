package com.eventpulse.payments.dto;

import com.eventpulse.payments.model.PaymentProvider;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentIntentResponse(
        UUID paymentId,
        UUID orderId,
        PaymentProvider provider,
        String clientSecret,
        String paymentIntentId,
        BigDecimal amount,
        String currency,
        String paymentMethod
) {}
