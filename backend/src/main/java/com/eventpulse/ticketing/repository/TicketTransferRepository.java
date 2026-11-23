package com.eventpulse.ticketing.repository;

import com.eventpulse.ticketing.model.TicketTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketTransferRepository extends JpaRepository<TicketTransfer, UUID> {
    List<TicketTransfer> findByTicketIdOrderByTransferredAtDesc(UUID ticketId);
}
