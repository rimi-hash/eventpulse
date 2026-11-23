package com.eventpulse.orders.controller;

import com.eventpulse.auth.security.UserPrincipal;
import com.eventpulse.common.api.ApiResponse;
import com.eventpulse.orders.dto.CreateOrderRequest;
import com.eventpulse.orders.dto.OrderResponseDto;
import com.eventpulse.orders.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "Orders & Checkout", description = "Endpoints for order creation from active holds, order details, and booking history")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    @Operation(summary = "Create order from active seat hold", description = "Converts active ephemeral hold session into a durable order in PAYMENT_PENDING state")
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderRequest request
    ) {
        OrderResponseDto order = orderService.createOrder(request, principal.getId(), idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Order created successfully", order));
    }

    @GetMapping("/{orderId}")
    @Operation(summary = "Get order details by ID")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OrderResponseDto order = orderService.getOrder(orderId, principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.ok("Order retrieved successfully", order));
    }

    @GetMapping("/my")
    @Operation(summary = "Get current customer's order history")
    public ResponseEntity<ApiResponse<List<OrderResponseDto>>> getMyOrders(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<OrderResponseDto> orders = orderService.getMyOrders(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Order history retrieved", orders));
    }

    @PostMapping("/{orderId}/apply-coupon")
    @Operation(summary = "Apply a promotional coupon code to an active pending order")
    public ResponseEntity<ApiResponse<OrderResponseDto>> applyCoupon(
            @PathVariable UUID orderId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String couponCode = body.get("couponCode");
        OrderResponseDto order = orderService.applyCouponToOrder(orderId, couponCode, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Coupon applied successfully", order));
    }

    @PostMapping("/{orderId}/cancel")
    @Operation(summary = "Cancel pending order and release inventory")
    public ResponseEntity<ApiResponse<OrderResponseDto>> cancelOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OrderResponseDto cancelled = orderService.cancelOrder(orderId, principal.getId(), principal.getRole());
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled successfully", cancelled));
    }
}
