package com.eventpulse.events.dto;

import com.eventpulse.events.model.EventCategory;
import com.eventpulse.events.model.EventStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EventDetailDto(
        UUID id,
        String title,
        String slug,
        String shortSummary,
        String description,
        EventCategory category,
        String bannerUrl,
        String thumbnailUrl,
        EventStatus status,
        String ageRestriction,
        boolean isFeatured,
        boolean requiresVirtualQueue,
        int maxTicketsPerUser,
        UUID organizationId,
        String organizationName,
        UUID venueId,
        String venueName,
        String venueAddress,
        String venueCity,
        String venueState,
        String venuePostalCode,
        Double venueLatitude,
        Double venueLongitude,
        String venueDirectionsUrl,
        List<SessionDto> sessions,
        List<TicketTypeDto> ticketTypes,
        String ticketSaleStatus,
        String officialInfoUrl,
        String officialBookingUrl,
        String imageSourceUrl,
        String imageAttribution,
        String verificationStatus,
        Instant lastVerifiedAt
) {}
