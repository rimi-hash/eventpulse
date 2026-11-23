package com.eventpulse.resale.dto;

import com.eventpulse.resale.model.ResaleListing;
import com.eventpulse.resale.model.ResaleListingStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

public record ResaleListingDto(
        UUID id,
        UUID ticketId,
        String ticketNumber,
        UUID eventId,
        String eventTitle,
        String bannerUrl,
        String sessionTitle,
        Instant sessionStartsAt,
        String venueName,
        String city,
        String ticketTypeName,
        String seatLabel,
        BigDecimal originalPrice,
        BigDecimal resalePrice,
        BigDecimal feeAmount,
        BigDecimal totalBuyerAmount,
        BigDecimal savingsAmount,
        double savingsPercentage,
        ResaleListingStatus status,
        String sellerName,
        Instant createdAt
) {
    public static ResaleListingDto from(ResaleListing listing) {
        if (listing == null) return null;
        BigDecimal savings = listing.getOriginalPrice().subtract(listing.getResalePrice()).max(BigDecimal.ZERO);
        double savingsPct = 0.0;
        if (listing.getOriginalPrice().compareTo(BigDecimal.ZERO) > 0) {
            savingsPct = savings.multiply(BigDecimal.valueOf(100))
                    .divide(listing.getOriginalPrice(), 1, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        BigDecimal fee = listing.getFeeAmount() != null ? listing.getFeeAmount() : listing.getResalePrice().multiply(BigDecimal.valueOf(0.05)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = listing.getTotalBuyerAmount() != null ? listing.getTotalBuyerAmount() : listing.getResalePrice().add(fee);

        return new ResaleListingDto(
                listing.getId(),
                listing.getTicket().getId(),
                listing.getTicket().getTicketNumber(),
                listing.getTicket().getEvent().getId(),
                listing.getTicket().getEvent().getTitle(),
                listing.getTicket().getEvent().getBannerUrl(),
                listing.getTicket().getSession().getSessionTitle(),
                listing.getTicket().getSession().getStartsAt(),
                listing.getTicket().getEvent().getVenue().getName(),
                listing.getTicket().getEvent().getVenue().getCity(),
                listing.getTicket().getTicketType().getName(),
                listing.getTicket().getSeatLabel(),
                listing.getOriginalPrice(),
                listing.getResalePrice(),
                fee,
                total,
                savings,
                savingsPct,
                listing.getStatus(),
                listing.getSeller().getFullName(),
                listing.getCreatedAt()
        );
    }
}
