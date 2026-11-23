package com.eventpulse.auth.dto;

import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String username,
        String fullName,
        String phoneNumber,
        String avatarUrl,
        Role role,
        boolean isVerified,
        Instant createdAt
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getAvatarUrl(),
                user.getRole(),
                user.isVerified(),
                user.getCreatedAt()
        );
    }
}
