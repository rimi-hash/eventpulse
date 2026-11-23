package com.eventpulse.ticketing.model;

import com.eventpulse.events.model.Event;
import com.eventpulse.events.model.EventSession;
import com.eventpulse.events.model.TicketType;
import com.eventpulse.orders.model.OrderItem;
import com.eventpulse.users.model.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 64)
    private String ticketNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private EventSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_owner_id", nullable = false)
    private User currentOwner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TicketStatus status = TicketStatus.ISSUED;

    @Column(name = "qr_cryptographic_payload", nullable = false, length = 1024)
    private String qrCryptographicPayload;

    @Column(name = "attendee_name", nullable = false, length = 128)
    private String attendeeName;

    @Column(name = "attendee_email", nullable = false, length = 255)
    private String attendeeEmail;

    @Column(name = "seat_label", length = 64)
    private String seatLabel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Ticket() {
    }

    public Ticket(OrderItem orderItem, String ticketNumber, Event event, EventSession session, TicketType ticketType, User currentOwner, String qrCryptographicPayload, String attendeeName, String attendeeEmail, String seatLabel) {
        this.orderItem = orderItem;
        this.ticketNumber = ticketNumber;
        this.event = event;
        this.session = session;
        this.ticketType = ticketType;
        this.currentOwner = currentOwner;
        this.qrCryptographicPayload = qrCryptographicPayload;
        this.attendeeName = attendeeName;
        this.attendeeEmail = attendeeEmail;
        this.seatLabel = seatLabel;
        this.status = TicketStatus.ISSUED;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public OrderItem getOrderItem() {
        return orderItem;
    }

    public void setOrderItem(OrderItem orderItem) {
        this.orderItem = orderItem;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(String ticketNumber) {
        this.ticketNumber = ticketNumber;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public EventSession getSession() {
        return session;
    }

    public void setSession(EventSession session) {
        this.session = session;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public void setTicketType(TicketType ticketType) {
        this.ticketType = ticketType;
    }

    public User getCurrentOwner() {
        return currentOwner;
    }

    public void setCurrentOwner(User currentOwner) {
        this.currentOwner = currentOwner;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public String getQrCryptographicPayload() {
        return qrCryptographicPayload;
    }

    public void setQrCryptographicPayload(String qrCryptographicPayload) {
        this.qrCryptographicPayload = qrCryptographicPayload;
    }

    public String getAttendeeName() {
        return attendeeName;
    }

    public void setAttendeeName(String attendeeName) {
        this.attendeeName = attendeeName;
    }

    public String getAttendeeEmail() {
        return attendeeEmail;
    }

    public void setAttendeeEmail(String attendeeEmail) {
        this.attendeeEmail = attendeeEmail;
    }

    public String getSeatLabel() {
        return seatLabel;
    }

    public void setSeatLabel(String seatLabel) {
        this.seatLabel = seatLabel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
