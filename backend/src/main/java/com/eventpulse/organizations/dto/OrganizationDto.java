package com.eventpulse.organizations.dto;

import com.eventpulse.organizations.model.Organization;
import java.time.Instant;
import java.util.UUID;

public record OrganizationDto(
        UUID id,
        String name,
        String slug,
        String billingEmail,
        String contactPhone,
        String organizationType,
        String description,
        String website,
        String logoUrl,
        String socialLinks,
        String businessAddress,
        String taxIdentifier,
        String verificationStatus,
        String rejectionReason,
        String operatingProfile,
        String payoutStatus,
        String payoutProvider,
        Instant createdAt,
        Instant updatedAt,
        UUID ownerId,
        String ownerName,
        String ownerEmail,
        Instant reviewedAt,
        String reviewedByEmail
) {
    public static OrganizationDto from(Organization org) {
        if (org == null) return null;
        UUID ownerId = org.getOwner() != null ? org.getOwner().getId() : null;
        String ownerName = org.getOwner() != null ? org.getOwner().getFullName() : null;
        String ownerEmail = org.getOwner() != null ? org.getOwner().getEmail() : null;
        String reviewedByEmail = org.getReviewedBy() != null ? org.getReviewedBy().getEmail() : null;

        return new OrganizationDto(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getBillingEmail(),
                org.getContactPhone(),
                org.getOrganizationType(),
                org.getDescription(),
                org.getWebsite(),
                org.getLogoUrl(),
                org.getSocialLinks(),
                org.getBusinessAddress(),
                org.getTaxIdentifier(),
                org.getVerificationStatus(),
                org.getRejectionReason(),
                org.getOperatingProfile(),
                org.getPayoutStatus() != null ? org.getPayoutStatus() : "READY",
                org.getPayoutProvider() != null ? org.getPayoutProvider() : "RAZORPAY_ROUTE",
                org.getCreatedAt(),
                org.getUpdatedAt(),
                ownerId,
                ownerName,
                ownerEmail,
                org.getReviewedAt(),
                reviewedByEmail
        );
    }
}
