package com.eventpulse.payments.repository;

import com.eventpulse.payments.model.WebhookEventRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEventRecord, UUID> {
    boolean existsByEventId(String eventId);
    Optional<WebhookEventRecord> findByEventId(String eventId);
}
