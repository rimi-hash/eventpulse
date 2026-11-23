package com.eventpulse.organizations.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrganizationRequest(
        @NotBlank(message = "Organization name is required")
        @Size(min = 2, max = 255)
        String name,

        @NotBlank(message = "Contact/billing email is required")
        @Email(message = "Invalid email format")
        String billingEmail,

        String contactPhone,

        String organizationType,

        String description,

        String website,

        String logoUrl,

        String socialLinks,

        String businessAddress,

        String taxIdentifier,

        String operatingProfile,

        String payoutStatus,

        String payoutProvider
) {}
