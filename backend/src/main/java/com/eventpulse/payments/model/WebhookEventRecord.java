package com.eventpulse.payments.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_event_records", indexes = {
        @Index(name = "idx_webhook_event_id", columnList = "eventId", unique = true)
})
public class WebhookEventRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String eventId;

    @Column(nullable = false, length = 100)
    private String eventType;

    @Column(nullable = false)
    private Instant processedAt;

    @Column(columnDefinition = "TEXT")
    private String payloadSummary;

    public WebhookEventRecord() {}

    public WebhookEventRecord(String eventId, String eventType, String payloadSummary) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.processedAt = Instant.now();
        this.payloadSummary = payloadSummary;
    }

    public UUID getId() {
        return id;
    }

    public String getEventId() {
        return eventId;
    }

    public String getEventType() {
        return eventType;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }

    public String getPayloadSummary() {
        return payloadSummary;
    }
}
