package com.eventpulse.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Payload for Google Identity Services OAuth sign-in")
public record GoogleAuthRequest(
        @NotBlank(message = "Google ID token credential is required")
        @Schema(description = "OpenID Connect ID Token issued by Google Identity Services", example = "eyJhbGciOiJSUzI1NiIs...")
        String idToken
) {}
