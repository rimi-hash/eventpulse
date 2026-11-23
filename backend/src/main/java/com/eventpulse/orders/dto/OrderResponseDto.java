package com.eventpulse.orders.dto;

import com.eventpulse.orders.model.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponseDto(
        UUID id,
        String orderNumber,
        UUID userId,
        String userName,
        UUID eventId,
        String eventTitle,
        String eventBannerUrl,
        UUID sessionId,
        String sessionTitle,
        Instant sessionStartsAt,
        String venueName,
        String venueCity,
        OrderStatus status,
        String currency,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal serviceFeeAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String contactEmail,
        String contactPhone,
        List<OrderItemDto> items,
        Instant createdAt
) {
    public record OrderItemDto(
            UUID id,
            UUID ticketTypeId,
            String ticketTypeName,
            BigDecimal unitPrice,
            String seatLabel
    ) {}
}
