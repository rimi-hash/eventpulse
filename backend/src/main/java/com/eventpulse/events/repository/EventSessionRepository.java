package com.eventpulse.events.repository;

import com.eventpulse.events.model.EventSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventSessionRepository extends JpaRepository<EventSession, UUID> {
    List<EventSession> findByEventIdOrderByStartsAtAsc(UUID eventId);
}
