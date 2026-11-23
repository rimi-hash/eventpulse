package com.eventpulse.payments.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Schema(description = "Client response from Razorpay Checkout modal for server-side cryptographic signature verification")
public record RazorpayVerifyRequest(
        @NotNull(message = "Order ID is required")
        UUID orderId,

        @NotNull(message = "Payment attempt ID is required")
        UUID paymentId,

        @NotBlank(message = "Razorpay Order ID is required")
        String razorpayOrderId,

        @NotBlank(message = "Razorpay Payment ID is required")
        String razorpayPaymentId,

        @NotBlank(message = "Razorpay Signature is required")
        String razorpaySignature
) {}
