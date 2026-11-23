package com.eventpulse.events.model;

import com.eventpulse.organizations.model.Organization;
import com.eventpulse.venues.model.Venue;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "short_summary", nullable = false, length = 512)
    private String shortSummary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private EventCategory category = EventCategory.CONCERT;

    @Column(name = "banner_url", length = 512)
    private String bannerUrl;

    @Column(name = "thumbnail_url", length = 512)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EventStatus status = EventStatus.DRAFT;

    @Column(name = "age_restriction", length = 32)
    private String ageRestriction = "ALL_AGES";

    @Column(name = "is_featured", nullable = false)
    private boolean isFeatured = false;

    @Column(name = "requires_virtual_queue", nullable = false)
    private boolean requiresVirtualQueue = false;

    @Column(name = "max_tickets_per_user", nullable = false)
    private int maxTicketsPerUser = 6;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "ticket_sale_status", nullable = false, length = 32)
    private String ticketSaleStatus = "EVENTPULSE_MANAGED"; // EVENTPULSE_MANAGED, EXTERNAL_TICKETS, INFO_ONLY

    @Column(name = "official_info_url", length = 512)
    private String officialInfoUrl;

    @Column(name = "official_booking_url", length = 512)
    private String officialBookingUrl;

    @Column(name = "image_source_url", length = 512)
    private String imageSourceUrl;

    @Column(name = "image_attribution", length = 512)
    private String imageAttribution;

    @Column(name = "verification_status", nullable = false, length = 32)
    private String verificationStatus = "VERIFIED"; // VERIFIED, UNVERIFIED

    @Column(name = "last_verified_at")
    private Instant lastVerifiedAt = Instant.now();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EventSession> sessions = new ArrayList<>();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketType> ticketTypes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Event() {
    }

    public Event(Organization organization, Venue venue, String title, String slug, String shortSummary, String description, EventCategory category) {
        this.organization = organization;
        this.venue = venue;
        this.title = title;
        this.slug = slug;
        this.shortSummary = shortSummary;
        this.description = description;
        this.category = category;
        this.status = EventStatus.DRAFT;
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

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public Venue getVenue() {
        return venue;
    }

    public void setVenue(Venue venue) {
        this.venue = venue;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getShortSummary() {
        return shortSummary;
    }

    public void setShortSummary(String shortSummary) {
        this.shortSummary = shortSummary;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EventCategory getCategory() {
        return category;
    }

    public void setCategory(EventCategory category) {
        this.category = category;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public String getAgeRestriction() {
        return ageRestriction;
    }

    public void setAgeRestriction(String ageRestriction) {
        this.ageRestriction = ageRestriction;
    }

    public boolean isFeatured() {
        return isFeatured;
    }

    public void setFeatured(boolean featured) {
        isFeatured = featured;
    }

    public boolean isRequiresVirtualQueue() {
        return requiresVirtualQueue;
    }

    public void setRequiresVirtualQueue(boolean requiresVirtualQueue) {
        this.requiresVirtualQueue = requiresVirtualQueue;
    }

    public int getMaxTicketsPerUser() {
        return maxTicketsPerUser;
    }

    public void setMaxTicketsPerUser(int maxTicketsPerUser) {
        this.maxTicketsPerUser = maxTicketsPerUser;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getTicketSaleStatus() {
        return ticketSaleStatus;
    }

    public void setTicketSaleStatus(String ticketSaleStatus) {
        this.ticketSaleStatus = ticketSaleStatus;
    }

    public String getOfficialInfoUrl() {
        return officialInfoUrl;
    }

    public void setOfficialInfoUrl(String officialInfoUrl) {
        this.officialInfoUrl = officialInfoUrl;
    }

    public String getOfficialBookingUrl() {
        return officialBookingUrl;
    }

    public void setOfficialBookingUrl(String officialBookingUrl) {
        this.officialBookingUrl = officialBookingUrl;
    }

    public String getImageSourceUrl() {
        return imageSourceUrl;
    }

    public void setImageSourceUrl(String imageSourceUrl) {
        this.imageSourceUrl = imageSourceUrl;
    }

    public String getImageAttribution() {
        return imageAttribution;
    }

    public void setImageAttribution(String imageAttribution) {
        this.imageAttribution = imageAttribution;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public Instant getLastVerifiedAt() {
        return lastVerifiedAt;
    }

    public void setLastVerifiedAt(Instant lastVerifiedAt) {
        this.lastVerifiedAt = lastVerifiedAt;
    }

    public List<EventSession> getSessions() {
        return sessions;
    }

    public void setSessions(List<EventSession> sessions) {
        this.sessions = sessions;
    }

    public List<TicketType> getTicketTypes() {
        return ticketTypes;
    }

    public void setTicketTypes(List<TicketType> ticketTypes) {
        this.ticketTypes = ticketTypes;
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

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
