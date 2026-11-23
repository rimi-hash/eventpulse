package com.eventpulse.analytics.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminDashboardStatsDto(
        long totalUsers,
        long totalOrganizers,
        long totalEvents,
        long totalOrders,
        BigDecimal platformGrossVolume,
        long totalTicketsIssued,
        long totalCheckins,
        List<RecentOrderDto> recentOrders
) {
    public BigDecimal getGrossTicketVolume() {
        return platformGrossVolume != null ? platformGrossVolume : BigDecimal.ZERO;
    }

    public record RecentOrderDto(
            String orderNumber,
            String customerEmail,
            String eventTitle,
            BigDecimal totalAmount,
            String status
    ) {}
}
