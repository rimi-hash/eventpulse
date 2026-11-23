package com.eventpulse.inventory.repository;

import com.eventpulse.inventory.model.SeatHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeatHoldRepository extends JpaRepository<SeatHold, UUID> {
    List<SeatHold> findBySessionToken(String sessionToken);
    List<SeatHold> findByUserIdAndReleasedAtIsNull(UUID userId);
}
