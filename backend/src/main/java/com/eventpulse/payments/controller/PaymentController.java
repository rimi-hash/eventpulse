package com.eventpulse.payments.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.payments.dto.*;
import com.eventpulse.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments & Settlement", description = "Endpoints for payment intents, local sandbox checkout, and payment confirmation")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/intent")
    @Operation(summary = "Initialize payment intent with gateway", description = "Creates a payment attempt for the designated order and returns gateway client credentials")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> createIntent(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody PaymentIntentRequest request
    ) {
        PaymentIntentResponse intent = paymentService.createIntent(request, principal.getId(), idempotencyKey);
        return ResponseEntity.ok(ApiResponse.ok("Payment intent initialized", intent));
    }

    @PostMapping("/confirm")
    @Operation(summary = "Confirm payment outcome", description = "Validates gateway response, reconciles order to CONFIRMED, updates inventory, and issues tickets")
    public ResponseEntity<ApiResponse<PaymentResponseDto>> confirmPayment(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ConfirmPaymentRequest request
    ) {
        PaymentResponseDto response = paymentService.confirmPayment(request, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Payment processed successfully", response));
    }

    @PostMapping("/razorpay/order/{orderId}")
    @Operation(summary = "Create server-side Razorpay order", description = "Authoritatively calculates order total and registers order with Razorpay API")
    public ResponseEntity<ApiResponse<RazorpayOrderResponse>> createRazorpayOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RazorpayOrderResponse orderResponse = paymentService.createRazorpayOrder(orderId, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Razorpay order created successfully", orderResponse));
    }

    @PostMapping("/razorpay/verify")
    @Operation(summary = "Verify Razorpay checkout payment", description = "Verifies HMAC-SHA256 signature and settles order")
    public ResponseEntity<ApiResponse<PaymentResponseDto>> verifyRazorpayPayment(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RazorpayVerifyRequest request
    ) {
        PaymentResponseDto response = paymentService.verifyAndConfirmRazorpay(request, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Razorpay payment verified and order confirmed", response));
    }

    @PostMapping("/razorpay/webhook")
    @Operation(summary = "Authoritative Razorpay webhook processor", description = "Verifies X-Razorpay-Signature HMAC and reconciles order/payment events")
    public ResponseEntity<ApiResponse<Map<String, String>>> handleRazorpayWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        String outcome = paymentService.handleRazorpayWebhook(rawPayload, signature);
        return ResponseEntity.ok(ApiResponse.ok(outcome, Map.of("status", "success", "result", outcome)));
    }

    @PostMapping("/webhook/{provider}")
    @Operation(summary = "Generic payment gateway webhook handler")
    public ResponseEntity<ApiResponse<Map<String, String>>> handleWebhook(
            @PathVariable String provider,
            @RequestBody String rawPayload,
            @RequestHeader(value = "X-Webhook-Signature", required = false) String signature
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Webhook acknowledged", Map.of("status", "received")));
    }
}
