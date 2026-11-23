package com.eventpulse.ticketing.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.model.OrderItem;
import com.eventpulse.ticketing.dto.TicketDto;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.model.TicketStatus;
import com.eventpulse.ticketing.model.TicketTransfer;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.ticketing.repository.TicketTransferRepository;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketTransferRepository transferRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${eventpulse.jwt.secret:4c696e6775615f4576656e7450756c73655f53757065725f5365637265745f4b65795f32303237}")
    private String signatureSecret;

    @Transactional
    public List<Ticket> issueTicketsForOrder(Order order) {
        List<Ticket> tickets = new ArrayList<>();

        for (OrderItem item : order.getItems()) {
            String ticketNumber = "TKT-2027-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
                    + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

            long timestamp = System.currentTimeMillis();
            String payloadData = "EP:" + ticketNumber + ":" + order.getId() + ":" + timestamp;
            String signature = signPayload(payloadData);
            String qrPayload = payloadData + ":" + signature;

            Ticket ticket = new Ticket(
                    item,
                    ticketNumber,
                    order.getEvent(),
                    order.getSession(),
                    item.getTicketType(),
                    order.getUser(),
                    qrPayload,
                    order.getUser().getFullName(),
                    order.getContactEmail(),
                    item.getSeatLabel()
            );

            tickets.add(ticketRepository.save(ticket));
        }

        return tickets;
    }

    @Transactional(readOnly = true)
    public List<TicketDto> getMyTickets(UUID userId) {
        return ticketRepository.findByCurrentOwnerIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketDto getTicket(UUID ticketId, UUID userId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketId));

        if (!ticket.getCurrentOwner().getId().equals(userId)) {
            throw new UnauthorizedException("You do not own this ticket");
        }

        return toDto(ticket);
    }

    @Transactional
    public TicketDto transferTicket(UUID ticketId, String recipientEmail, UUID senderUserId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketId));

        if (!ticket.getCurrentOwner().getId().equals(senderUserId)) {
            throw new UnauthorizedException("Only the ticket owner can transfer this ticket");
        }

        if (ticket.getStatus() != TicketStatus.ISSUED) {
            throw new BadRequestException("Ticket cannot be transferred in status: " + ticket.getStatus());
        }

        User recipient = userRepository.findByEmail(recipientEmail.toLowerCase().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Recipient user with email " + recipientEmail + " not found"));

        if (recipient.getId().equals(senderUserId)) {
            throw new BadRequestException("You cannot transfer a ticket to yourself");
        }

        User sender = ticket.getCurrentOwner();
        ticket.setCurrentOwner(recipient);
        ticket.setAttendeeName(recipient.getFullName());
        ticket.setAttendeeEmail(recipient.getEmail());
        ticket = ticketRepository.save(ticket);

        transferRepository.save(new TicketTransfer(ticket, sender, recipient));
        return toDto(ticket);
    }

    public String signPayload(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(signatureSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString().substring(0, 16);
        } catch (Exception e) {
            return UUID.randomUUID().toString().substring(0, 16);
        }
    }

    public TicketDto toDto(Ticket ticket) {
        return new TicketDto(
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getOrderItem().getOrder().getId(),
                ticket.getOrderItem().getOrder().getOrderNumber(),
                ticket.getEvent().getId(),
                ticket.getEvent().getTitle(),
                ticket.getEvent().getBannerUrl(),
                ticket.getSession().getId(),
                ticket.getSession().getSessionTitle(),
                ticket.getSession().getStartsAt(),
                ticket.getEvent().getVenue().getName(),
                ticket.getEvent().getVenue().getCity(),
                ticket.getTicketType().getName(),
                ticket.getSeatLabel(),
                ticket.getStatus(),
                ticket.getAttendeeName(),
                ticket.getAttendeeEmail(),
                ticket.getQrCryptographicPayload(),
                ticket.getTicketType() != null ? ticket.getTicketType().getTotalPrice() : java.math.BigDecimal.ZERO,
                ticket.getCreatedAt()
        );
    }
}
