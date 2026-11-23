package com.eventpulse.venues.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "venue_sections")
public class VenueSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "section_code", nullable = false, length = 32)
    private String sectionCode;

    @Column(nullable = false)
    private int capacity;

    @Column(name = "is_general_admission", nullable = false)
    private boolean isGeneralAdmission = false;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "shape_type", length = 32)
    private String shapeType = "RECTANGLE"; // RECTANGLE, CIRCLE, ARC, STADIUM, BANQUET_TABLES, GA_FLOOR, POLYGON

    @Column(name = "transform_json", columnDefinition = "TEXT")
    private String transformJson;

    @Column(name = "pricing_tier", length = 64)
    private String pricingTier = "Standard";

    @Column(name = "base_price", precision = 12, scale = 2)
    private java.math.BigDecimal basePrice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public VenueSection() {
    }

    public VenueSection(Venue venue, String name, String sectionCode, int capacity, boolean isGeneralAdmission, int displayOrder) {
        this.venue = venue;
        this.name = name;
        this.sectionCode = sectionCode;
        this.capacity = capacity;
        this.isGeneralAdmission = isGeneralAdmission;
        this.displayOrder = displayOrder;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Venue getVenue() {
        return venue;
    }

    public void setVenue(Venue venue) {
        this.venue = venue;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSectionCode() {
        return sectionCode;
    }

    public void setSectionCode(String sectionCode) {
        this.sectionCode = sectionCode;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public boolean isGeneralAdmission() {
        return isGeneralAdmission;
    }

    public void setGeneralAdmission(boolean generalAdmission) {
        isGeneralAdmission = generalAdmission;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public String getShapeType() {
        return shapeType;
    }

    public void setShapeType(String shapeType) {
        this.shapeType = shapeType;
    }

    public String getTransformJson() {
        return transformJson;
    }

    public void setTransformJson(String transformJson) {
        this.transformJson = transformJson;
    }

    public String getPricingTier() {
        return pricingTier;
    }

    public void setPricingTier(String pricingTier) {
        this.pricingTier = pricingTier;
    }

    public java.math.BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(java.math.BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
