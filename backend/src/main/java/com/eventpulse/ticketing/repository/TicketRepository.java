package com.eventpulse.ticketing.repository;

import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByTicketNumber(String ticketNumber);
    List<Ticket> findByCurrentOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    List<Ticket> findByEventId(UUID eventId);
    long countByEventIdAndStatus(UUID eventId, TicketStatus status);
    long countByEventId(UUID eventId);
}
