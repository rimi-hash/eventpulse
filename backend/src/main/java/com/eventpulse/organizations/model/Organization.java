package com.eventpulse.organizations.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private com.eventpulse.users.model.User owner;

    @Column(name = "logo_url", length = 512)
    private String logoUrl;

    @Column(length = 255)
    private String website;

    @Column(name = "tax_identifier", length = 64)
    private String taxIdentifier;

    @Column(name = "billing_email", nullable = false, length = 255)
    private String billingEmail;

    @Column(name = "contact_phone", length = 32)
    private String contactPhone;

    @Column(name = "organization_type", length = 64)
    private String organizationType = "ENTERPRISE"; // ENTERPRISE, AGENCY, INDEPENDENT, NON_PROFIT

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "social_links", length = 512)
    private String socialLinks;

    @Column(name = "business_address", length = 512)
    private String businessAddress;

    @Column(name = "rejection_reason", length = 512)
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private com.eventpulse.users.model.User reviewedBy;

    @Column(name = "verification_status", nullable = false, length = 32)
    private String verificationStatus = "VERIFIED"; // DRAFT, SUBMITTED, PENDING, VERIFIED, REJECTED, SUSPENDED

    @Column(name = "operating_profile", columnDefinition = "TEXT")
    private String operatingProfile;

    @Column(name = "payout_status", nullable = false, length = 32)
    private String payoutStatus = "READY"; // NOT_CONFIGURED, PENDING_VERIFICATION, READY

    @Column(name = "payout_provider", length = 64)
    private String payoutProvider = "RAZORPAY_ROUTE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Organization() {
    }

    public Organization(String name, String slug, String billingEmail) {
        this.name = name;
        this.slug = slug;
        this.billingEmail = billingEmail;
        this.verificationStatus = "VERIFIED";
    }

    public Organization(String name, String slug, String billingEmail, com.eventpulse.users.model.User owner) {
        this.name = name;
        this.slug = slug;
        this.billingEmail = billingEmail;
        this.owner = owner;
        this.verificationStatus = "PENDING";
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getTaxIdentifier() {
        return taxIdentifier;
    }

    public void setTaxIdentifier(String taxIdentifier) {
        this.taxIdentifier = taxIdentifier;
    }

    public String getBillingEmail() {
        return billingEmail;
    }

    public void setBillingEmail(String billingEmail) {
        this.billingEmail = billingEmail;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public com.eventpulse.users.model.User getOwner() {
        return owner;
    }

    public void setOwner(com.eventpulse.users.model.User owner) {
        this.owner = owner;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getOrganizationType() {
        return organizationType;
    }

    public void setOrganizationType(String organizationType) {
        this.organizationType = organizationType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSocialLinks() {
        return socialLinks;
    }

    public void setSocialLinks(String socialLinks) {
        this.socialLinks = socialLinks;
    }

    public String getBusinessAddress() {
        return businessAddress;
    }

    public void setBusinessAddress(String businessAddress) {
        this.businessAddress = businessAddress;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getOperatingProfile() {
        return operatingProfile;
    }

    public void setOperatingProfile(String operatingProfile) {
        this.operatingProfile = operatingProfile;
    }

    public String getPayoutStatus() {
        return payoutStatus;
    }

    public void setPayoutStatus(String payoutStatus) {
        this.payoutStatus = payoutStatus;
    }

    public String getPayoutProvider() {
        return payoutProvider;
    }

    public void setPayoutProvider(String payoutProvider) {
        this.payoutProvider = payoutProvider;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public com.eventpulse.users.model.User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(com.eventpulse.users.model.User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }
}
