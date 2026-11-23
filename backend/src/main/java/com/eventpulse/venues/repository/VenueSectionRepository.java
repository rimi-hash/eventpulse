package com.eventpulse.venues.repository;

import com.eventpulse.venues.model.VenueSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VenueSectionRepository extends JpaRepository<VenueSection, UUID> {
    List<VenueSection> findByVenueId(UUID venueId);
    List<VenueSection> findByVenueIdOrderByDisplayOrderAsc(UUID venueId);
}
