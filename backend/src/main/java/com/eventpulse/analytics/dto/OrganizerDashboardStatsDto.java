package com.eventpulse.analytics.dto;

import java.math.BigDecimal;
import java.util.List;

public record OrganizerDashboardStatsDto(
        long totalEvents,
        long activeEvents,
        long totalTicketsSold,
        BigDecimal grossRevenue,
        double checkinRate,
        List<EventPerformanceDto> topEvents
) {
    public record EventPerformanceDto(
            String title,
            String category,
            long ticketsSold,
            long totalCapacity,
            BigDecimal revenue
    ) {}
}
