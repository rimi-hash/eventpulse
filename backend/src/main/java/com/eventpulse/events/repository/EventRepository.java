package com.eventpulse.events.repository;

import com.eventpulse.events.model.Event;
import com.eventpulse.events.model.EventCategory;
import com.eventpulse.events.model.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    Optional<Event> findBySlug(String slug);

    List<Event> findByIsFeaturedTrueAndStatusIn(List<EventStatus> statuses);

    Page<Event> findByStatusIn(List<EventStatus> statuses, Pageable pageable);

    Page<Event> findByStatusInAndCategory(List<EventStatus> statuses, EventCategory category, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.status IN :statuses AND " +
           "(:category IS NULL OR e.category = :category) AND " +
           "(:city IS NULL OR LOWER(e.venue.city) = :city) AND " +
           "(:pattern IS NULL OR LOWER(e.title) LIKE :pattern OR LOWER(e.shortSummary) LIKE :pattern OR LOWER(e.venue.city) LIKE :pattern OR LOWER(e.venue.name) LIKE :pattern)")
    Page<Event> searchEvents(
            @Param("statuses") List<EventStatus> statuses,
            @Param("category") EventCategory category,
            @Param("city") String city,
            @Param("pattern") String pattern,
            Pageable pageable
    );

    @Query("SELECT e FROM Event e WHERE e.status IN :statuses AND " +
           "(:category IS NULL OR e.category = :category) AND " +
           "(LOWER(e.title) LIKE :pattern OR LOWER(e.shortSummary) LIKE :pattern OR LOWER(e.venue.city) LIKE :pattern)")
    Page<Event> searchByText(
            @Param("statuses") List<EventStatus> statuses,
            @Param("category") EventCategory category,
            @Param("pattern") String pattern,
            Pageable pageable
    );

    List<Event> findByStatusInOrderByCreatedAtDesc(List<EventStatus> statuses);

    List<Event> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
}
