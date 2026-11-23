package com.eventpulse.venues.repository;

import com.eventpulse.venues.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findBySectionId(UUID sectionId);
    List<Seat> findBySectionIdOrderByRowLabelAscSeatNumberAsc(UUID sectionId);
    List<Seat> findBySectionVenueId(UUID venueId);
}
