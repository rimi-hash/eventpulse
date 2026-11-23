package com.eventpulse.auth.dto;

public record GoogleUserInfo(
        String sub,
        String email,
        String name,
        String picture,
        boolean emailVerified
) {}
