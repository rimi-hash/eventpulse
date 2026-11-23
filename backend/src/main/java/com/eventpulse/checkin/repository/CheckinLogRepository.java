package com.eventpulse.checkin.repository;

import com.eventpulse.checkin.model.CheckinLog;
import com.eventpulse.checkin.model.CheckinScanResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CheckinLogRepository extends JpaRepository<CheckinLog, UUID> {
    List<CheckinLog> findByTicketIdOrderByScanTimestampDesc(UUID ticketId);
    Optional<CheckinLog> findFirstByTicketIdAndScanResultOrderByScanTimestampAsc(UUID ticketId, CheckinScanResult scanResult);
    List<CheckinLog> findByTicketEventIdOrderByScanTimestampDesc(UUID eventId);
    long countByTicketEventIdAndScanResult(UUID eventId, CheckinScanResult scanResult);
}
