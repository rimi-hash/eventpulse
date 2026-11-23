package com.eventpulse.events.repository;

import com.eventpulse.events.model.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketTypeRepository extends JpaRepository<TicketType, UUID> {
    List<TicketType> findByEventIdAndIsActiveTrue(UUID eventId);
    List<TicketType> findByEventId(UUID eventId);

    @Modifying
    @Query("UPDATE TicketType t SET t.section = null WHERE t.section.id IN :sectionIds")
    void clearSectionReferences(@Param("sectionIds") List<UUID> sectionIds);
}

