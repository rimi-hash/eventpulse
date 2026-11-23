package com.eventpulse.venues.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "seats", uniqueConstraints = {
        @UniqueConstraint(name = "uq_section_row_seat", columnNames = {"section_id", "row_label", "seat_number"})
})
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private VenueSection section;

    @Column(name = "row_label", nullable = false, length = 16)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false, length = 16)
    private String seatNumber;

    @Column(name = "is_accessible", nullable = false)
    private boolean isAccessible = false;

    @Column(name = "is_companion", nullable = false)
    private boolean isCompanion = false;

    @Column(name = "grid_x")
    private Integer gridX;

    @Column(name = "grid_y")
    private Integer gridY;

    @Column(name = "coord_x")
    private Double coordX;

    @Column(name = "coord_y")
    private Double coordY;

    @Column(name = "rotation")
    private Double rotation;

    @Column(name = "tier", length = 64)
    private String tier;

    @Column(name = "override_price", precision = 12, scale = 2)
    private java.math.BigDecimal overridePrice;

    @Column(name = "is_blocked", nullable = false)
    private boolean isBlocked = false;

    @Column(name = "is_restricted_view", nullable = false)
    private boolean isRestrictedView = false;

    public Seat() {
    }

    public Seat(VenueSection section, String rowLabel, String seatNumber, Integer gridX, Integer gridY) {
        this.section = section;
        this.rowLabel = rowLabel;
        this.seatNumber = seatNumber;
        this.gridX = gridX;
        this.gridY = gridY;
    }

    public String getSeatLabel() {
        return (section != null ? section.getName() + " - " : "") + "Row " + rowLabel + " Seat " + seatNumber;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public VenueSection getSection() {
        return section;
    }

    public void setSection(VenueSection section) {
        this.section = section;
    }

    public String getRowLabel() {
        return rowLabel;
    }

    public void setRowLabel(String rowLabel) {
        this.rowLabel = rowLabel;
    }

    public String getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(String seatNumber) {
        this.seatNumber = seatNumber;
    }

    public boolean isAccessible() {
        return isAccessible;
    }

    public void setAccessible(boolean accessible) {
        isAccessible = accessible;
    }

    public boolean isCompanion() {
        return isCompanion;
    }

    public void setCompanion(boolean companion) {
        isCompanion = companion;
    }

    public Integer getGridX() {
        return gridX;
    }

    public void setGridX(Integer gridX) {
        this.gridX = gridX;
    }

    public Integer getGridY() {
        return gridY;
    }

    public void setGridY(Integer gridY) {
        this.gridY = gridY;
    }

    public Double getCoordX() {
        return coordX;
    }

    public void setCoordX(Double coordX) {
        this.coordX = coordX;
    }

    public Double getCoordY() {
        return coordY;
    }

    public void setCoordY(Double coordY) {
        this.coordY = coordY;
    }

    public Double getRotation() {
        return rotation;
    }

    public void setRotation(Double rotation) {
        this.rotation = rotation;
    }

    public String getTier() {
        return tier;
    }

    public void setTier(String tier) {
        this.tier = tier;
    }

    public java.math.BigDecimal getOverridePrice() {
        return overridePrice;
    }

    public void setOverridePrice(java.math.BigDecimal overridePrice) {
        this.overridePrice = overridePrice;
    }

    public boolean isBlocked() {
        return isBlocked;
    }

    public void setBlocked(boolean blocked) {
        isBlocked = blocked;
    }

    public boolean isRestrictedView() {
        return isRestrictedView;
    }

    public void setRestrictedView(boolean restrictedView) {
        isRestrictedView = restrictedView;
    }
}
