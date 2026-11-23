package com.eventpulse.analytics.service;

import com.eventpulse.checkin.model.CheckinLog;
import com.eventpulse.checkin.repository.CheckinLogRepository;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.events.model.Event;
import com.eventpulse.events.model.TicketType;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.repository.OrderRepository;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.promotions.model.Coupon;
import com.eventpulse.promotions.repository.CouponRepository;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CsvExportService {

    private static final String UTF8_BOM = "\uFEFF";
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private CheckinLogRepository checkinLogRepository;

    @Autowired
    private UserRepository userRepository;

    private void verifyOrganizerEventAccess(Event event, UUID organizerUserId) {
        if (organizerUserId == null) return;
        Organization org = organizationRepository.findFirstByOwnerId(organizerUserId).orElse(null);
        if (org != null && event.getOrganization() != null && !event.getOrganization().getId().equals(org.getId())) {
            throw new UnauthorizedException("Unauthorized: You do not have permission to access records for this event.");
        }
    }

    /**
     * Sanitizes CSV field values against formula injection (=, +, -, @) and escapes quotes and commas.
     */
    public String sanitize(Object value) {
        if (value == null) return "";
        String str = value.toString().trim();
        if (str.isEmpty()) return "";

        // Mitigate CSV Formula Injection by prepending single quote if starts with formula operator
        char firstChar = str.charAt(0);
        if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@' || firstChar == '\t' || firstChar == '\r') {
            str = "'" + str;
        }

        // Escape double quotes by doubling them
        boolean needsQuotes = str.contains(",") || str.contains("\"") || str.contains("\n") || str.contains("\r");
        if (str.contains("\"")) {
            str = str.replace("\"", "\"\"");
        }

        if (needsQuotes) {
            return "\"" + str + "\"";
        }
        return str;
    }

    @Transactional(readOnly = true)
    public byte[] exportAttendeesCsv(UUID eventId, UUID organizerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        verifyOrganizerEventAccess(event, organizerUserId);

        List<Ticket> tickets = ticketRepository.findByEventId(eventId);
        StringBuilder sb = new StringBuilder(UTF8_BOM);
        sb.append("Order Number,Ticket Number,Attendee Name,Attendee Email,Ticket Tier,Seat Label,Status,Issue Date (UTC)\r\n");

        for (Ticket t : tickets) {
            String orderNo = t.getOrderItem() != null && t.getOrderItem().getOrder() != null
                    ? t.getOrderItem().getOrder().getOrderNumber() : "N/A";
            String tier = t.getTicketType() != null ? t.getTicketType().getName() : "General";
            String seat = t.getSeatLabel() != null ? t.getSeatLabel() : "General Admission";
            String date = t.getCreatedAt() != null ? ISO_FORMATTER.format(t.getCreatedAt()) : "";

            sb.append(sanitize(orderNo)).append(",")
              .append(sanitize(t.getTicketNumber())).append(",")
              .append(sanitize(t.getAttendeeName())).append(",")
              .append(sanitize(t.getAttendeeEmail())).append(",")
              .append(sanitize(tier)).append(",")
              .append(sanitize(seat)).append(",")
              .append(sanitize(t.getStatus().name())).append(",")
              .append(sanitize(date)).append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportOrdersCsv(UUID eventId, UUID organizerUserId) {
        List<Order> orders;
        if (eventId != null) {
            Event event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
            verifyOrganizerEventAccess(event, organizerUserId);
            orders = orderRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        } else {
            orders = orderRepository.findAll();
        }

        StringBuilder sb = new StringBuilder(UTF8_BOM);
        sb.append("Order Number,Customer Name,Contact Email,Contact Phone,Event Title,Total Amount (INR),Status,Order Date (UTC)\r\n");

        for (Order o : orders) {
            String custName = o.getUser() != null ? o.getUser().getFullName() : "Guest";
            String title = o.getEvent() != null ? o.getEvent().getTitle() : "N/A";
            String date = o.getCreatedAt() != null ? ISO_FORMATTER.format(o.getCreatedAt()) : "";

            sb.append(sanitize(o.getOrderNumber())).append(",")
              .append(sanitize(custName)).append(",")
              .append(sanitize(o.getContactEmail())).append(",")
              .append(sanitize(o.getContactPhone())).append(",")
              .append(sanitize(title)).append(",")
              .append(sanitize(o.getTotalAmount().toString())).append(",")
              .append(sanitize(o.getStatus().name())).append(",")
              .append(sanitize(date)).append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportInventoryCsv(UUID eventId, UUID organizerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        verifyOrganizerEventAccess(event, organizerUserId);

        StringBuilder sb = new StringBuilder(UTF8_BOM);
        sb.append("Event Title,Ticket Tier,Section Name,Base Price,Service Fee,Tax Amount,Total Price,Quota,Sold Count,Available Quantity\r\n");

        if (event.getTicketTypes() != null) {
            for (TicketType tt : event.getTicketTypes()) {
                String sec = tt.getSection() != null ? tt.getSection().getName() : "General Floor";
                sb.append(sanitize(event.getTitle())).append(",")
                  .append(sanitize(tt.getName())).append(",")
                  .append(sanitize(sec)).append(",")
                  .append(sanitize(tt.getBasePrice())).append(",")
                  .append(sanitize(tt.getServiceFee())).append(",")
                  .append(sanitize(tt.getTaxAmount())).append(",")
                  .append(sanitize(tt.getTotalPrice())).append(",")
                  .append(sanitize(tt.getQuota())).append(",")
                  .append(sanitize(tt.getSoldCount())).append(",")
                  .append(sanitize(tt.getAvailableQuantity())).append("\r\n");
            }
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportCouponsCsv(UUID organizerUserId) {
        Organization org = organizationRepository.findFirstByOwnerId(organizerUserId).orElse(null);
        List<Coupon> coupons = org != null
                ? couponRepository.findByOrganizationIdOrderByCreatedAtDesc(org.getId())
                : couponRepository.findAll();

        StringBuilder sb = new StringBuilder(UTF8_BOM);
        sb.append("Coupon Code,Description,Discount Type,Discount Value,Min Order (INR),Max Cap (INR),Redemptions Count,Max Allowed,Status,Created Date\r\n");

        for (Coupon c : coupons) {
            String status = c.isActive() ? "ACTIVE" : "DISABLED";
            sb.append(sanitize(c.getCode())).append(",")
              .append(sanitize(c.getDescription())).append(",")
              .append(sanitize(c.getDiscountType().name())).append(",")
              .append(sanitize(c.getDiscountValue())).append(",")
              .append(sanitize(c.getMinOrderValue())).append(",")
              .append(sanitize(c.getMaxDiscountCap() != null ? c.getMaxDiscountCap() : "N/A")).append(",")
              .append(sanitize(c.getRedemptionCount())).append(",")
              .append(sanitize(c.getMaxRedemptions() != null ? c.getMaxRedemptions() : "Unlimited")).append(",")
              .append(sanitize(status)).append(",")
              .append(sanitize(ISO_FORMATTER.format(c.getCreatedAt()))).append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportCheckinCsv(UUID eventId, UUID organizerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        verifyOrganizerEventAccess(event, organizerUserId);

        List<CheckinLog> logs = checkinLogRepository.findByTicketEventIdOrderByScanTimestampDesc(eventId);
        StringBuilder sb = new StringBuilder(UTF8_BOM);
        sb.append("Ticket Number,Attendee Name,Seat Label,Gate Name,Staff Attendant,Scan Result,Scan Timestamp (UTC)\r\n");

        for (CheckinLog l : logs) {
            String tktNo = l.getTicket() != null ? l.getTicket().getTicketNumber() : "N/A";
            String att = l.getTicket() != null ? l.getTicket().getAttendeeName() : "Unknown";
            String seat = l.getTicket() != null ? l.getTicket().getSeatLabel() : "General";
            String staff = l.getStaffUser() != null ? l.getStaffUser().getFullName() : "Gate Staff";

            sb.append(sanitize(tktNo)).append(",")
              .append(sanitize(att)).append(",")
              .append(sanitize(seat)).append(",")
              .append(sanitize(l.getGateName())).append(",")
              .append(sanitize(staff)).append(",")
              .append(sanitize(l.getScanResult().name())).append(",")
              .append(sanitize(ISO_FORMATTER.format(l.getScanTimestamp()))).append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportPlatformUsersCsv() {
        List<User> users = userRepository.findAll();
        StringBuilder sb = new StringBuilder(UTF8_BOM);
        sb.append("User ID,Full Name,Email,Role,Phone Number,Verified,Active,Created At (UTC)\r\n");

        for (User u : users) {
            sb.append(sanitize(u.getId())).append(",")
              .append(sanitize(u.getFullName())).append(",")
              .append(sanitize(u.getEmail())).append(",")
              .append(sanitize(u.getRole().name())).append(",")
              .append(sanitize(u.getPhoneNumber())).append(",")
              .append(sanitize(u.isVerified())).append(",")
              .append(sanitize(u.isActive())).append(",")
              .append(sanitize(ISO_FORMATTER.format(u.getCreatedAt()))).append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }
}
