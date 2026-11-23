package com.eventpulse.payments.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Server-created Razorpay order details required by Razorpay Checkout JS modal")
public record RazorpayOrderResponse(
        UUID paymentId,
        UUID orderId,
        String razorpayOrderId,
        String razorpayKeyId,
        long amountInPaise,
        String currency,
        String orderNumber,
        String customerEmail,
        String customerPhone,
        String eventTitle
) {}
