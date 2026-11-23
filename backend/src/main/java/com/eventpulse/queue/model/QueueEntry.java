package com.eventpulse.queue.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "queue_entries", uniqueConstraints = {
        @UniqueConstraint(name = "uq_event_user_queue", columnNames = {"event_id", "user_id"})
})
public class QueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "session_token", nullable = false, length = 255)
    private String sessionToken;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 32)
    private String status = "WAITING"; // WAITING, ADMITTED, EXPIRED

    @Column(name = "admission_token", length = 512)
    private String admissionToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "admitted_at")
    private Instant admittedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    public QueueEntry() {
    }

    public QueueEntry(UUID eventId, UUID userId, String sessionToken, int position) {
        this.eventId = eventId;
        this.userId = userId;
        this.sessionToken = sessionToken;
        this.position = position;
        this.status = "WAITING";
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAdmissionToken() {
        return admissionToken;
    }

    public void setAdmissionToken(String admissionToken) {
        this.admissionToken = admissionToken;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getAdmittedAt() {
        return admittedAt;
    }

    public void setAdmittedAt(Instant admittedAt) {
        this.admittedAt = admittedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
