package com.eventpulse.queue.service;

import com.eventpulse.queue.dto.QueueResponseDto;
import com.eventpulse.queue.model.QueueEntry;
import com.eventpulse.queue.repository.QueueEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class QueueService {

    @Autowired
    private QueueEntryRepository queueEntryRepository;

    @Transactional
    public QueueResponseDto joinQueue(UUID eventId, UUID userId) {
        Optional<QueueEntry> existing = queueEntryRepository.findByEventIdAndUserId(eventId, userId);
        if (existing.isPresent()) {
            return toDto(existing.get());
        }

        long count = queueEntryRepository.countByEventIdAndStatus(eventId, "WAITING");
        int position = (int) count + 1;
        String sessionToken = "qst_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        QueueEntry entry = new QueueEntry(eventId, userId, sessionToken, position);

        // If position is low or 1, admit immediately
        if (position <= 1) {
            entry.setStatus("ADMITTED");
            entry.setAdmissionToken("adm_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
            entry.setAdmittedAt(Instant.now());
            entry.setExpiresAt(Instant.now().plusSeconds(900)); // 15 mins to book
        }

        entry = queueEntryRepository.save(entry);
        return toDto(entry);
    }

    @Transactional
    public QueueResponseDto getQueueStatus(UUID eventId, UUID userId) {
        QueueEntry entry = queueEntryRepository.findByEventIdAndUserId(eventId, userId)
                .orElseGet(() -> {
                    QueueEntry newEntry = new QueueEntry(eventId, userId, "qst_" + UUID.randomUUID().toString().substring(0, 8), 1);
                    newEntry.setStatus("ADMITTED");
                    newEntry.setAdmissionToken("adm_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
                    newEntry.setAdmittedAt(Instant.now());
                    newEntry.setExpiresAt(Instant.now().plusSeconds(900));
                    return queueEntryRepository.save(newEntry);
                });

        // Fast-forward position if waiting
        if ("WAITING".equals(entry.getStatus()) && entry.getPosition() > 1) {
            entry.setPosition(Math.max(1, entry.getPosition() - 1));
            if (entry.getPosition() == 1) {
                entry.setStatus("ADMITTED");
                entry.setAdmissionToken("adm_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
                entry.setAdmittedAt(Instant.now());
                entry.setExpiresAt(Instant.now().plusSeconds(900));
            }
            entry = queueEntryRepository.save(entry);
        }

        return toDto(entry);
    }

    private QueueResponseDto toDto(QueueEntry entry) {
        int waitSeconds = "ADMITTED".equals(entry.getStatus()) ? 0 : entry.getPosition() * 30;
        return new QueueResponseDto(
                entry.getEventId(),
                entry.getUserId(),
                entry.getSessionToken(),
                entry.getPosition(),
                waitSeconds,
                entry.getStatus(),
                entry.getAdmissionToken(),
                entry.getExpiresAt()
        );
    }
}
