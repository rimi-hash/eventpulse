package com.eventpulse.inventory.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.events.model.TicketType;
import com.eventpulse.events.repository.TicketTypeRepository;
import com.eventpulse.inventory.dto.CreateHoldRequest;
import com.eventpulse.inventory.dto.HoldResponseDto;
import com.eventpulse.inventory.dto.SeatAvailabilityDto;
import com.eventpulse.inventory.model.InventoryStatus;
import com.eventpulse.inventory.model.SeatHold;
import com.eventpulse.inventory.model.SeatInventory;
import com.eventpulse.inventory.repository.SeatHoldRepository;
import com.eventpulse.inventory.repository.SeatInventoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);
    private static final int DEFAULT_HOLD_SECONDS = 480; // 8 minutes

    @Autowired
    private SeatInventoryRepository inventoryRepository;

    @Autowired
    private SeatHoldRepository seatHoldRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Transactional(readOnly = true)
    public List<SeatAvailabilityDto> getAvailability(UUID sessionId) {
        Instant now = Instant.now();
        List<SeatInventory> items = inventoryRepository.findBySessionId(sessionId);

        return items.stream().map(item -> {
            InventoryStatus currentStatus = item.getStatus();
            // Check if hold has expired lazily
            if (currentStatus == InventoryStatus.HELD && item.getHoldExpiresAt() != null && item.getHoldExpiresAt().isBefore(now)) {
                currentStatus = InventoryStatus.AVAILABLE;
            }

            return new SeatAvailabilityDto(
                    item.getId(),
                    item.getTicketType().getId(),
                    item.getTicketType().getName(),
                    item.getTicketType().getTotalPrice(),
                    item.getSeat() != null ? item.getSeat().getId() : null,
                    item.getSeat() != null ? item.getSeat().getRowLabel() : null,
                    item.getSeat() != null ? item.getSeat().getSeatNumber() : null,
                    item.getSeat() != null && item.getSeat().getSection() != null ? item.getSeat().getSection().getName() : "General Admission",
                    item.getSeat() == null,
                    currentStatus,
                    item.getSeat() != null ? item.getSeat().getGridX() : null,
                    item.getSeat() != null ? item.getSeat().getGridY() : null
            );
        }).toList();
    }

    @Transactional
    public HoldResponseDto createHold(UUID sessionId, CreateHoldRequest request, UUID userId) {
        return createHold(null, sessionId, request, userId);
    }

    @Transactional
    public HoldResponseDto createHold(UUID eventId, UUID sessionId, CreateHoldRequest request, UUID userId) {
        TicketType ticketType = ticketTypeRepository.findById(request.ticketTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Ticket type not found: " + request.ticketTypeId()));

        // Validate ticket type belongs to specified event if provided
        if (eventId != null && ticketType.getEvent() != null && !ticketType.getEvent().getId().equals(eventId)) {
            throw new BadRequestException("Ticket tier does not belong to specified event: " + eventId);
        }

        int durationSeconds = request.holdDurationSeconds() != null && request.holdDurationSeconds() > 0
                ? request.holdDurationSeconds()
                : DEFAULT_HOLD_SECONDS;

        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(durationSeconds);
        String holdToken = "hst_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        List<SeatInventory> itemsToHold = new ArrayList<>();

        if (request.seatIds() != null && !request.seatIds().isEmpty()) {
            // Specific reserved seats requested
            for (UUID seatId : request.seatIds()) {
                SeatInventory inventory = inventoryRepository.findBySessionIdAndSeatId(sessionId, seatId)
                        .orElseThrow(() -> new ResourceNotFoundException("Seat not found in session inventory: " + seatId));

                // Validate session belongs to specified event if provided
                if (eventId != null && inventory.getSession() != null && inventory.getSession().getEvent() != null
                        && !inventory.getSession().getEvent().getId().equals(eventId)) {
                    throw new BadRequestException("Session does not belong to specified event: " + eventId);
                }

                // Force DB refresh with pessimistic lock to prevent concurrent double-booking
                entityManager.refresh(inventory, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);

                String seatLabel = inventory.getSeat() != null ? inventory.getSeat().getSeatLabel() : String.valueOf(seatId);

                // Validate seat belongs to requested ticket tier
                if (!inventory.getTicketType().getId().equals(ticketType.getId())) {
                    throw new BadRequestException("Seat " + seatLabel + " does not belong to ticket tier: " + ticketType.getName());
                }

                if (inventory.getStatus() == InventoryStatus.SOLD) {
                    throw new ConflictException("Seat " + seatLabel + " is already sold");
                }
                if (inventory.getStatus() == InventoryStatus.BLOCKED) {
                    throw new BadRequestException("Seat " + seatLabel + " is blocked and not available for booking");
                }

                // Check active hold by another customer
                if (inventory.getStatus() == InventoryStatus.HELD && inventory.getHoldExpiresAt() != null && inventory.getHoldExpiresAt().isAfter(now)) {
                    if (inventory.getHoldUserId() != null && !inventory.getHoldUserId().equals(userId)) {
                        throw new ConflictException("Seat " + seatLabel + " is currently held by another customer");
                    }
                }

                inventory.setStatus(InventoryStatus.HELD);
                inventory.setHoldUserId(userId);
                inventory.setHoldSessionToken(holdToken);
                inventory.setHoldExpiresAt(expiresAt);
                itemsToHold.add(inventory);
            }
        } else {
            // General admission / quantity-based hold
            int quantity = request.quantity() != null && request.quantity() > 0 ? request.quantity() : 1;
            List<SeatInventory> allItems = inventoryRepository.findBySessionIdAndTicketTypeId(sessionId, ticketType.getId());

            int heldCount = 0;
            for (SeatInventory inv : allItems) {
                if (heldCount >= quantity) break;
                // Acquire lock and refresh
                entityManager.refresh(inv, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
                if (inv.isAvailable()) {
                    inv.setStatus(InventoryStatus.HELD);
                    inv.setHoldUserId(userId);
                    inv.setHoldSessionToken(holdToken);
                    inv.setHoldExpiresAt(expiresAt);
                    itemsToHold.add(inv);
                    heldCount++;
                }
            }

            if (heldCount < quantity) {
                throw new ConflictException("Insufficient tickets available. Requested: " + quantity + ", Available: " + heldCount);
            }
        }

        inventoryRepository.saveAll(itemsToHold);

        // Record audit hold entities
        for (SeatInventory inv : itemsToHold) {
            seatHoldRepository.save(new SeatHold(inv, userId, holdToken, expiresAt));
        }

        // Cache in Redis if available
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set("hold:" + holdToken, userId.toString(), Duration.ofSeconds(durationSeconds));
            } catch (Exception ex) {
                log.warn("Redis hold cache failed: {}", ex.getMessage());
            }
        }

        return buildHoldResponse(holdToken, expiresAt, itemsToHold, ticketType);
    }

    @Transactional
    public void releaseHold(String holdToken, UUID userId) {
        List<SeatInventory> heldItems = inventoryRepository.findByHoldSessionToken(holdToken);
        for (SeatInventory item : heldItems) {
            if (userId != null && item.getHoldUserId() != null && !item.getHoldUserId().equals(userId)) {
                throw new com.eventpulse.common.exception.UnauthorizedException("You are not authorized to release another customer's seat hold");
            }
            if (item.getStatus() == InventoryStatus.HELD) {
                item.setStatus(InventoryStatus.AVAILABLE);
                item.setHoldUserId(null);
                item.setHoldSessionToken(null);
                item.setHoldExpiresAt(null);
            }
        }
        inventoryRepository.saveAll(heldItems);

        List<SeatHold> holds = seatHoldRepository.findBySessionToken(holdToken);
        for (SeatHold hold : holds) {
            if (hold.getReleasedAt() == null) {
                hold.setReleasedAt(Instant.now());
                hold.setReleaseReason("USER_ABANDONED");
            }
        }
        seatHoldRepository.saveAll(holds);

        if (redisTemplate != null) {
            try {
                redisTemplate.delete("hold:" + holdToken);
            } catch (Exception ignored) {}
        }
    }

    @Transactional(readOnly = true)
    public HoldResponseDto getActiveHold(UUID sessionId, UUID userId) {
        Instant now = Instant.now();
        List<SeatInventory> held = inventoryRepository.findBySessionId(sessionId).stream()
                .filter(i -> i.getStatus() == InventoryStatus.HELD && userId.equals(i.getHoldUserId()) && i.getHoldExpiresAt() != null && i.getHoldExpiresAt().isAfter(now))
                .toList();

        if (held.isEmpty()) {
            return null;
        }

        SeatInventory first = held.get(0);
        return buildHoldResponse(first.getHoldSessionToken(), first.getHoldExpiresAt(), held, first.getTicketType());
    }

    @Scheduled(fixedRate = 15000)
    @Transactional
    public void cleanupExpiredHolds() {
        Instant now = Instant.now();
        List<SeatInventory> expiredItems = inventoryRepository.findExpiredHolds(now);
        if (!expiredItems.isEmpty()) {
            log.info("Releasing {} expired seat holds", expiredItems.size());
            for (SeatInventory item : expiredItems) {
                item.setStatus(InventoryStatus.AVAILABLE);
                item.setHoldUserId(null);
                item.setHoldSessionToken(null);
                item.setHoldExpiresAt(null);
            }
            inventoryRepository.saveAll(expiredItems);
        }
    }

    private HoldResponseDto buildHoldResponse(String holdToken, Instant expiresAt, List<SeatInventory> items, TicketType ticketType) {
        long remainingSeconds = Math.max(0, Duration.between(Instant.now(), expiresAt).getSeconds());

        List<HoldResponseDto.HeldSeatDto> seatDtos = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal fees = BigDecimal.ZERO;
        BigDecimal taxes = BigDecimal.ZERO;

        for (SeatInventory inv : items) {
            String label = inv.getSeat() != null
                    ? inv.getSeat().getSeatLabel()
                    : ticketType.getName() + " Pass #" + inv.getId().toString().substring(0, 4);

            BigDecimal unitPrice = inv.getTicketType().getBasePrice();
            subtotal = subtotal.add(unitPrice);
            fees = fees.add(inv.getTicketType().getServiceFee());
            taxes = taxes.add(inv.getTicketType().getTaxAmount());

            seatDtos.add(new HoldResponseDto.HeldSeatDto(
                    inv.getId(),
                    inv.getSeat() != null ? inv.getSeat().getId() : null,
                    label,
                    inv.getTicketType().getTotalPrice()
            ));
        }

        BigDecimal total = subtotal.add(fees).add(taxes);

        return new HoldResponseDto(
                holdToken,
                expiresAt,
                remainingSeconds,
                seatDtos,
                subtotal,
                fees,
                taxes,
                total,
                ticketType.getCurrency()
        );
    }
}
