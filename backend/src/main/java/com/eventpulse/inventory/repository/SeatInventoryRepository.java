package com.eventpulse.inventory.repository;

import com.eventpulse.inventory.model.InventoryStatus;
import com.eventpulse.inventory.model.SeatInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeatInventoryRepository extends JpaRepository<SeatInventory, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SeatInventory s WHERE s.id = :id")
    Optional<SeatInventory> findByIdWithLock(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SeatInventory s WHERE s.id IN :ids")
    List<SeatInventory> findAllByIdWithLock(@Param("ids") List<UUID> ids);

    List<SeatInventory> findBySessionId(UUID sessionId);

    List<SeatInventory> findBySessionIdAndTicketTypeId(UUID sessionId, UUID ticketTypeId);

    List<SeatInventory> findByHoldSessionToken(String holdSessionToken);

    @Query("SELECT s FROM SeatInventory s WHERE s.status = 'HELD' AND s.holdExpiresAt < :now")
    List<SeatInventory> findExpiredHolds(@Param("now") Instant now);

    long countBySessionIdAndStatus(UUID sessionId, InventoryStatus status);

    long countByTicketTypeIdAndStatus(UUID ticketTypeId, InventoryStatus status);

    Optional<SeatInventory> findBySessionIdAndSeatId(UUID sessionId, UUID seatId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE SeatInventory s SET s.seat = null WHERE s.seat.id IN :seatIds")
    void clearSeatReferences(@Param("seatIds") List<UUID> seatIds);
}
