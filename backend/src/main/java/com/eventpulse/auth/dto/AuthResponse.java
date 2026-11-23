package com.eventpulse.auth.dto;

import com.eventpulse.users.model.Role;

import java.util.UUID;

public record AuthResponse(
        String token,
        String tokenType,
        UUID userId,
        String email,
        String username,
        String fullName,
        Role role
) {
    public static AuthResponse of(String token, UUID userId, String email, String username, String fullName, Role role) {
        return new AuthResponse(token, "Bearer", userId, email, username, fullName, role);
    }
}
