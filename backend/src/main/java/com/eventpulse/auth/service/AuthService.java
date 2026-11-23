package com.eventpulse.auth.service;

import com.eventpulse.auth.dto.*;
import com.eventpulse.auth.model.PasswordResetToken;
import com.eventpulse.auth.repository.PasswordResetTokenRepository;
import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private GoogleAuthService googleAuthService;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Transactional
    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        GoogleUserInfo googleUser = googleAuthService.verifyToken(request.idToken());
        String normalizedEmail = googleUser.email().toLowerCase().trim();

        User user = userRepository.findByEmail(normalizedEmail)
                .map(existingUser -> {
                    if (!existingUser.isActive()) {
                        throw new UnauthorizedException("Account has been deactivated. Please contact support.");
                    }
                    if (existingUser.getAvatarUrl() == null && googleUser.picture() != null) {
                        existingUser.setAvatarUrl(googleUser.picture());
                    }
                    if (existingUser.getUsername() == null) {
                        String derivedUsername = normalizedEmail.split("@")[0].toLowerCase().replaceAll("[^a-z0-9._-]", "");
                        if (!userRepository.existsByUsername(derivedUsername)) {
                            existingUser.setUsername(derivedUsername);
                        }
                    }
                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    String baseUsername = normalizedEmail.split("@")[0].toLowerCase().replaceAll("[^a-z0-9._-]", "");
                    String finalUsername = baseUsername;
                    int suffix = 1;
                    while (userRepository.existsByUsername(finalUsername)) {
                        finalUsername = baseUsername + suffix++;
                    }

                    User newUser = new User(
                            normalizedEmail,
                            finalUsername,
                            passwordEncoder.encode(UUID.randomUUID().toString()),
                            googleUser.name() != null ? googleUser.name().trim() : baseUsername,
                            Role.CUSTOMER
                    );
                    newUser.setAvatarUrl(googleUser.picture());
                    newUser.setVerified(true);
                    return userRepository.save(newUser);
                });

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name(), user.getFullName());
        return AuthResponse.of(token, user.getId(), user.getEmail(), user.getUsername(), user.getFullName(), user.getRole());
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("Email is already registered: " + request.email());
        }

        // Determine & normalize username
        if (request.username() == null || request.username().trim().isEmpty()) {
            throw new BadRequestException("Username is required");
        }
        String normalizedUsername = request.username().toLowerCase().trim();
        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new ConflictException("Username is already taken: " + request.username());
        }

        // Strict password policy validation: 8-12 characters, letter, number, and special character
        String pwd = request.password();
        if (pwd == null || pwd.length() < 8 || pwd.length() > 12 
                || !pwd.matches(".*[A-Za-z].*") 
                || !pwd.matches(".*\\d.*") 
                || !pwd.matches(".*[^a-zA-Z0-9].*")) {
            throw new BadRequestException("Password must be 8-12 characters and contain at least one letter, one number, and one special character.");
        }

        // Security check: Customer registration ALWAYS defaults to ROLE_CUSTOMER
        // Privilege escalation via request body is strictly prevented.
        Role role = Role.CUSTOMER;

        String displayName = (request.fullName() != null && !request.fullName().trim().isEmpty())
                ? request.fullName().trim()
                : normalizedUsername;

        User user = new User(
                normalizedEmail,
                normalizedUsername,
                passwordEncoder.encode(pwd),
                displayName,
                role
        );
        user.setPhoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null);
        user.setVerified(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name(), user.getFullName());
        return AuthResponse.of(token, user.getId(), user.getEmail(), user.getUsername(), user.getFullName(), user.getRole());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String identifier = request.email().toLowerCase().trim();

        // Support authentication via either email or username
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new UnauthorizedException("Invalid email/username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email/username or password");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Account has been deactivated. Please contact support.");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name(), user.getFullName());
        return AuthResponse.of(token, user.getId(), user.getEmail(), user.getUsername(), user.getFullName(), user.getRole());
    }

    @Transactional
    public String requestPasswordReset(ForgotPasswordRequest request) {
        String identifier = request.identifier().toLowerCase().trim();
        userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .ifPresent(user -> {
                    String resetToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
                    Instant expiresAt = Instant.now().plus(30, ChronoUnit.MINUTES);
                    PasswordResetToken tokenRecord = new PasswordResetToken(resetToken, user, expiresAt);
                    passwordResetTokenRepository.save(tokenRecord);
                });

        // Always return clean message without revealing whether account exists (anti-enumeration)
        return "If an account matches the provided identifier, password reset instructions have been generated.";
    }

    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        PasswordResetToken tokenRecord = passwordResetTokenRepository.findByTokenAndUsedFalse(request.token())
                .orElseThrow(() -> new BadRequestException("Invalid or already used password reset token"));

        if (tokenRecord.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Password reset token has expired. Please request a new one.");
        }

        String newPwd = request.newPassword();
        if (newPwd == null || newPwd.length() < 12 || !newPwd.matches(".*[A-Za-z].*") || !newPwd.matches(".*\\d.*")) {
            throw new BadRequestException("New password must be at least 12 characters long and contain at least one letter and one number.");
        }

        User user = tokenRecord.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPwd));
        userRepository.save(user);

        tokenRecord.setUsed(true);
        passwordResetTokenRepository.save(tokenRecord);

        return "Password has been successfully reset. You may now sign in with your new credentials.";
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return UserProfileResponse.from(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        user.setFullName(request.fullName().trim());
        if (request.phoneNumber() != null) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl().trim());
        }

        user = userRepository.save(user);
        return UserProfileResponse.from(user);
    }
}
