package com.eventpulse.organizations.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.organizations.dto.CreateOrganizationRequest;
import com.eventpulse.organizations.dto.OrganizationDto;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class OrganizationService {

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public OrganizationDto getMyOrganization(UUID userId) {
        if (userId == null) return null;
        Organization org = organizationRepository.findFirstByOwnerId(userId).orElse(null);
        if (org == null) {
            return null;
        }
        return OrganizationDto.from(org);
    }

    @Transactional(readOnly = true)
    public OrganizationDto getOrganizationById(UUID orgId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));
        return OrganizationDto.from(org);
    }

    @Transactional
    public OrganizationDto applyForVerification(UUID userId, CreateOrganizationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Optional<Organization> existingOpt = organizationRepository.findFirstByOwnerId(userId);

        Organization org;
        if (existingOpt.isPresent()) {
            org = existingOpt.get();
            if ("PENDING".equalsIgnoreCase(org.getVerificationStatus())) {
                throw new ConflictException("An organizer application is already pending administrative review");
            }
            if ("VERIFIED".equalsIgnoreCase(org.getVerificationStatus())) {
                throw new ConflictException("Your organization is already verified and approved");
            }
            // If REJECTED, allow re-application by updating the existing record
            populateOrganizationFields(org, request);
            org.setVerificationStatus("PENDING");
            org.setRejectionReason(null);
            org.setReviewedAt(null);
            org.setReviewedBy(null);
        } else {
            String slug = generateSlug(request.name());
            org = new Organization(request.name().trim(), slug, request.billingEmail().trim(), user);
            populateOrganizationFields(org, request);
            org.setVerificationStatus("PENDING");
            org.setRejectionReason(null);
            org.setReviewedAt(null);
            org.setReviewedBy(null);
        }

        org = organizationRepository.save(org);

        // NOTE: The user remains ROLE_CUSTOMER until an administrator explicitly reviews and approves!
        return OrganizationDto.from(org);
    }

    @Transactional
    public OrganizationDto updateOrganization(UUID userId, CreateOrganizationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Organization org = organizationRepository.findFirstByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No organization profile found for user"));

        populateOrganizationFields(org, request);

        // If it was rejected, updating it moves it back to PENDING for re-review
        if ("REJECTED".equalsIgnoreCase(org.getVerificationStatus())) {
            org.setVerificationStatus("PENDING");
            org.setRejectionReason(null);
            org.setReviewedAt(null);
            org.setReviewedBy(null);
        }

        org = organizationRepository.save(org);
        return OrganizationDto.from(org);
    }

    @Transactional(readOnly = true)
    public List<OrganizationDto> getPendingOrganizations() {
        return organizationRepository.findByVerificationStatus("PENDING").stream()
                .map(OrganizationDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrganizationDto> getAllOrganizations() {
        return organizationRepository.findAll().stream()
                .map(OrganizationDto::from)
                .toList();
    }

    @Transactional
    public OrganizationDto approveOrganization(UUID orgId, UUID adminUserId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));

        org.setVerificationStatus("VERIFIED");
        org.setRejectionReason(null);
        org.setReviewedAt(Instant.now());

        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(org::setReviewedBy);
        }

        org = organizationRepository.save(org);

        // Authoritative role transition: promote owner from CUSTOMER to ORGANIZER
        if (org.getOwner() != null && org.getOwner().getRole() == Role.CUSTOMER) {
            org.getOwner().setRole(Role.ORGANIZER);
            userRepository.save(org.getOwner());
        }

        return OrganizationDto.from(org);
    }

    @Transactional
    public OrganizationDto rejectOrganization(UUID orgId, UUID adminUserId, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Rejection reason cannot be blank");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + orgId));

        org.setVerificationStatus("REJECTED");
        org.setRejectionReason(reason.trim());
        org.setReviewedAt(Instant.now());

        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(org::setReviewedBy);
        }

        org = organizationRepository.save(org);

        // Owner remains CUSTOMER
        return OrganizationDto.from(org);
    }

    private void populateOrganizationFields(Organization org, CreateOrganizationRequest request) {
        org.setName(request.name().trim());
        org.setBillingEmail(request.billingEmail().trim());
        org.setContactPhone(request.contactPhone() != null ? request.contactPhone().trim() : null);
        org.setOrganizationType(request.organizationType() != null ? request.organizationType() : "ENTERPRISE");
        org.setDescription(request.description() != null ? request.description().trim() : null);
        org.setWebsite(request.website() != null ? request.website().trim() : null);
        org.setLogoUrl(request.logoUrl() != null ? request.logoUrl().trim() : null);
        org.setSocialLinks(request.socialLinks() != null ? request.socialLinks().trim() : null);
        org.setBusinessAddress(request.businessAddress() != null ? request.businessAddress().trim() : null);
        org.setTaxIdentifier(request.taxIdentifier() != null ? request.taxIdentifier().trim() : null);
        org.setOperatingProfile(request.operatingProfile() != null ? request.operatingProfile().trim() : null);
        if (request.payoutStatus() != null) {
            org.setPayoutStatus(request.payoutStatus());
        }
        if (request.payoutProvider() != null) {
            org.setPayoutProvider(request.payoutProvider());
        }
    }

    private String generateSlug(String name) {
        String slug = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        if (slug.isEmpty()) slug = "org-" + UUID.randomUUID().toString().substring(0, 8);
        if (organizationRepository.findBySlug(slug).isPresent()) {
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 4);
        }
        return slug;
    }
}
