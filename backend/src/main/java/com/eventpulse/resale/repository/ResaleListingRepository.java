package com.eventpulse.resale.repository;

import com.eventpulse.resale.model.ResaleListing;
import com.eventpulse.resale.model.ResaleListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResaleListingRepository extends JpaRepository<ResaleListing, UUID> {
    
    @Query("SELECT r FROM ResaleListing r WHERE r.ticket.event.id = :eventId AND r.status = :status ORDER BY r.resalePrice ASC")
    List<ResaleListing> findByEventIdAndStatus(@Param("eventId") UUID eventId, @Param("status") ResaleListingStatus status);

    List<ResaleListing> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);

    List<ResaleListing> findByStatusOrderByCreatedAtDesc(ResaleListingStatus status);

    Optional<ResaleListing> findByTicketIdAndStatus(UUID ticketId, ResaleListingStatus status);

    boolean existsByTicketIdAndStatus(UUID ticketId, ResaleListingStatus status);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ResaleListing r WHERE r.id = :id")
    Optional<ResaleListing> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT r FROM ResaleListing r WHERE r.status = :status AND r.holdExpiresAt IS NOT NULL AND r.holdExpiresAt < :now")
    List<ResaleListing> findExpiredHolds(@Param("status") ResaleListingStatus status, @Param("now") java.time.Instant now);
}
