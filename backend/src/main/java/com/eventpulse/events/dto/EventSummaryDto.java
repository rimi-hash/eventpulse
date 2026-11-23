package com.eventpulse.events.dto;

import com.eventpulse.events.model.EventCategory;
import com.eventpulse.events.model.EventStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EventSummaryDto(
        UUID id,
        String title,
        String slug,
        String shortSummary,
        EventCategory category,
        String bannerUrl,
        String thumbnailUrl,
        EventStatus status,
        boolean isFeatured,
        boolean requiresVirtualQueue,
        String venueName,
        String city,
        BigDecimal startingPrice,
        String currency,
        Instant nextSessionStartsAt,
        String ticketSaleStatus,
        String officialInfoUrl,
        String officialBookingUrl,
        String imageSourceUrl,
        String imageAttribution,
        String verificationStatus,
        Instant lastVerifiedAt
) {}
