package com.eventpulse.orders.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateOrderRequest(
        @NotBlank(message = "Hold session token is required")
        String holdSessionToken,

        @JsonAlias({"customerEmail", "email"})
        @NotBlank(message = "Contact email is required")
        @Email(message = "Invalid email format")
        String contactEmail,

        @JsonAlias({"customerPhone", "phone"})
        @NotBlank(message = "Contact phone is required")
        String contactPhone,

        String couponCode
) {}
