package com.eventpulse.users.dto;

import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;

import java.time.Instant;
import java.util.UUID;

public record AdminUserDto(
        UUID id,
        String username,
        String email,
        String fullName,
        String phoneNumber,
        Role role,
        boolean isActive,
        boolean isVerified,
        Instant createdAt,
        Instant updatedAt
) {
    public static AdminUserDto from(User user) {
        return new AdminUserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getRole(),
                user.isActive(),
                user.isVerified(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
