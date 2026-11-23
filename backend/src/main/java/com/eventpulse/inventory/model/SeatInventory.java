package com.eventpulse.inventory.model;

import com.eventpulse.events.model.EventSession;
import com.eventpulse.events.model.TicketType;
import com.eventpulse.venues.model.Seat;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "seat_inventory", uniqueConstraints = {
        @UniqueConstraint(name = "uq_session_seat", columnNames = {"session_id", "seat_id"})
})
public class SeatInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private EventSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id")
    private Seat seat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private InventoryStatus status = InventoryStatus.AVAILABLE;

    @Column(name = "hold_user_id")
    private UUID holdUserId;

    @Column(name = "hold_session_token", length = 255)
    private String holdSessionToken;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Version
    @Column(nullable = false)
    private int version = 0;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public SeatInventory() {
    }

    public SeatInventory(EventSession session, TicketType ticketType, Seat seat) {
        this.session = session;
        this.ticketType = ticketType;
        this.seat = seat;
        this.status = InventoryStatus.AVAILABLE;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public boolean isAvailable() {
        if (this.status == InventoryStatus.AVAILABLE) {
            return true;
        }
        if (this.status == InventoryStatus.HELD && this.holdExpiresAt != null && this.holdExpiresAt.isBefore(Instant.now())) {
            return true;
        }
        return false;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public EventSession getSession() {
        return session;
    }

    public void setSession(EventSession session) {
        this.session = session;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public void setTicketType(TicketType ticketType) {
        this.ticketType = ticketType;
    }

    public Seat getSeat() {
        return seat;
    }

    public void setSeat(Seat seat) {
        this.seat = seat;
    }

    public InventoryStatus getStatus() {
        return status;
    }

    public void setStatus(InventoryStatus status) {
        this.status = status;
    }

    public UUID getHoldUserId() {
        return holdUserId;
    }

    public void setHoldUserId(UUID holdUserId) {
        this.holdUserId = holdUserId;
    }

    public String getHoldSessionToken() {
        return holdSessionToken;
    }

    public void setHoldSessionToken(String holdSessionToken) {
        this.holdSessionToken = holdSessionToken;
    }

    public Instant getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public void setHoldExpiresAt(Instant holdExpiresAt) {
        this.holdExpiresAt = holdExpiresAt;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
