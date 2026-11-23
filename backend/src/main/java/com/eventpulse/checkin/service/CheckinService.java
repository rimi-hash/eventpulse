package com.eventpulse.checkin.service;

import com.eventpulse.checkin.dto.CheckinResultDto;
import com.eventpulse.checkin.dto.EventScanStatsDto;
import com.eventpulse.checkin.dto.ValidateTicketRequest;
import com.eventpulse.checkin.model.CheckinLog;
import com.eventpulse.checkin.model.CheckinScanResult;
import com.eventpulse.checkin.repository.CheckinLogRepository;
import com.eventpulse.events.model.Event;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.model.TicketStatus;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CheckinService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private CheckinLogRepository checkinLogRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public CheckinResultDto validateTicket(ValidateTicketRequest request, UUID staffUserId) {
        User staffUser = staffUserId != null ? userRepository.findById(staffUserId).orElse(null) : null;
        String gateName = request.gateName() != null && !request.gateName().isBlank() ? request.gateName() : "Main Gate";

        String raw = request.ticketCodeOrQrPayload().trim();
        String ticketNumber = parseTicketNumber(raw);

        Optional<Ticket> ticketOpt = ticketRepository.findByTicketNumber(ticketNumber);
        if (ticketOpt.isEmpty()) {
            try {
                UUID id = UUID.fromString(raw);
                ticketOpt = ticketRepository.findById(id);
            } catch (Exception ignored) {}
        }

        if (ticketOpt.isEmpty()) {
            return new CheckinResultDto(
                    CheckinScanResult.INVALID_TICKET,
                    null,
                    ticketNumber,
                    "Unknown Event",
                    "Unknown Session",
                    "Unknown",
                    "N/A",
                    gateName,
                    Instant.now(),
                    "Ticket number or QR code was not recognized in system",
                    null
            );
        }

        Ticket ticket = ticketOpt.get();

        if (ticket.getStatus() == TicketStatus.USED) {
            // Duplicate scan prevention!
            Optional<CheckinLog> firstScan = checkinLogRepository.findFirstByTicketIdAndScanResultOrderByScanTimestampAsc(
                    ticket.getId(), CheckinScanResult.VALID);

            CheckinResultDto.FirstScanDetails firstScanDetails = null;
            if (firstScan.isPresent()) {
                CheckinLog log = firstScan.get();
                firstScanDetails = new CheckinResultDto.FirstScanDetails(
                        log.getScanTimestamp(),
                        log.getGateName(),
                        log.getStaffUser() != null ? log.getStaffUser().getFullName() : "Gate Attendant"
                );
            }

            // Record duplicate scan attempt
            checkinLogRepository.save(new CheckinLog(
                    ticket,
                    gateName,
                    staffUser,
                    CheckinScanResult.ALREADY_USED,
                    request.deviceInfo()
            ));

            return new CheckinResultDto(
                    CheckinScanResult.ALREADY_USED,
                    ticket.getId(),
                    ticket.getTicketNumber(),
                    ticket.getEvent().getTitle(),
                    ticket.getSession().getSessionTitle(),
                    ticket.getAttendeeName(),
                    ticket.getSeatLabel(),
                    gateName,
                    Instant.now(),
                    "Ticket has already been redeemed and cannot be reused",
                    firstScanDetails
            );
        }

        if (ticket.getStatus() == TicketStatus.REVOKED) {
            checkinLogRepository.save(new CheckinLog(
                    ticket,
                    gateName,
                    staffUser,
                    CheckinScanResult.REVOKED,
                    request.deviceInfo()
            ));

            return new CheckinResultDto(
                    CheckinScanResult.REVOKED,
                    ticket.getId(),
                    ticket.getTicketNumber(),
                    ticket.getEvent().getTitle(),
                    ticket.getSession().getSessionTitle(),
                    ticket.getAttendeeName(),
                    ticket.getSeatLabel(),
                    gateName,
                    Instant.now(),
                    "Ticket has been revoked or cancelled",
                    null
            );
        }

        // Successfully check-in
        ticket.setStatus(TicketStatus.USED);
        ticketRepository.save(ticket);

        checkinLogRepository.save(new CheckinLog(
                ticket,
                gateName,
                staffUser,
                CheckinScanResult.VALID,
                request.deviceInfo()
        ));

        return new CheckinResultDto(
                CheckinScanResult.VALID,
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getEvent().getTitle(),
                ticket.getSession().getSessionTitle(),
                ticket.getAttendeeName(),
                ticket.getSeatLabel(),
                gateName,
                Instant.now(),
                "Entry approved. Welcome, " + ticket.getAttendeeName() + "!",
                null
        );
    }

    @Transactional(readOnly = true)
    public EventScanStatsDto getScanStats(UUID eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        String eventTitle = event != null ? event.getTitle() : "Event " + eventId;

        long totalIssued = ticketRepository.countByEventId(eventId);
        long totalCheckedIn = ticketRepository.countByEventIdAndStatus(eventId, TicketStatus.USED);
        long alreadyUsedAttempts = checkinLogRepository.countByTicketEventIdAndScanResult(eventId, CheckinScanResult.ALREADY_USED);

        double percentage = totalIssued > 0 ? ((double) totalCheckedIn / totalIssued) * 100.0 : 0.0;

        return new EventScanStatsDto(
                eventId,
                eventTitle,
                totalIssued,
                totalCheckedIn,
                Math.round(percentage * 10.0) / 10.0,
                alreadyUsedAttempts
        );
    }

    @Transactional(readOnly = true)
    public List<com.eventpulse.checkin.dto.CheckinLogDto> getRecentLogs(UUID eventId) {
        List<CheckinLog> logs = checkinLogRepository.findByTicketEventIdOrderByScanTimestampDesc(eventId);
        return logs.stream().limit(30).map(l -> new com.eventpulse.checkin.dto.CheckinLogDto(
                l.getId(),
                l.getTicket() != null ? l.getTicket().getTicketNumber() : "N/A",
                l.getTicket() != null ? l.getTicket().getAttendeeName() : "Unknown Attendee",
                l.getTicket() != null ? l.getTicket().getSeatLabel() : "General Admission",
                l.getGateName(),
                l.getStaffUser() != null ? l.getStaffUser().getFullName() : "Gate Attendant",
                l.getScanResult(),
                l.getScanTimestamp()
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<Event> getCheckinEvents() {
        return eventRepository.findAll();
    }

    private String parseTicketNumber(String raw) {
        if (raw.startsWith("EP:TKT:")) {
            String[] parts = raw.split(":");
            if (parts.length >= 3) {
                return parts[2];
            }
        }
        return raw;
    }
}
