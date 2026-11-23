package com.eventpulse.payments.dto;

import com.eventpulse.payments.model.PaymentProvider;
import com.eventpulse.payments.model.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponseDto(
        UUID id,
        UUID orderId,
        String orderNumber,
        PaymentProvider gatewayProvider,
        String gatewayTransactionId,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        String paymentMethod,
        Instant confirmedAt,
        String failureReason
) {}
