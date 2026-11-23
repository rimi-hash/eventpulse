package com.eventpulse.resale.dto;

public record ResaleConfirmPaymentRequest(
        String paymentProvider, // "RAZORPAY", "MOCK"
        String razorpayOrderId,
        String razorpayPaymentId,
        String razorpaySignature
) {}
