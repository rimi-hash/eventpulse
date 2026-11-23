package com.eventpulse.analytics.service;

import com.eventpulse.analytics.dto.AdminDashboardStatsDto;
import com.eventpulse.analytics.dto.OrganizerDashboardStatsDto;
import com.eventpulse.checkin.model.CheckinScanResult;
import com.eventpulse.checkin.repository.CheckinLogRepository;
import com.eventpulse.events.model.Event;
import com.eventpulse.events.model.EventStatus;
import com.eventpulse.events.model.TicketType;
import com.eventpulse.events.repository.EventRepository;
import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.model.OrderStatus;
import com.eventpulse.orders.repository.OrderRepository;
import com.eventpulse.ticketing.model.TicketStatus;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DashboardService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private CheckinLogRepository checkinLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.eventpulse.organizations.repository.OrganizationRepository organizationRepository;

    @Transactional(readOnly = true)
    public OrganizerDashboardStatsDto getOrganizerStats(UUID userId) {
        List<Event> allEvents;
        if (userId != null) {
            com.eventpulse.organizations.model.Organization org = organizationRepository.findFirstByOwnerId(userId).orElse(null);
            if (org != null) {
                allEvents = eventRepository.findByOrganizationIdOrderByCreatedAtDesc(org.getId());
            } else {
                allEvents = eventRepository.findAll();
            }
        } else {
            allEvents = eventRepository.findAll();
        }

        long totalEvents = allEvents.size();
        long activeEvents = allEvents.stream()
                .filter(e -> e.getStatus() == EventStatus.PUBLISHED || e.getStatus() == EventStatus.SALES_OPEN)
                .count();

        long totalTicketsSold = 0;
        BigDecimal grossRevenue = BigDecimal.ZERO;
        List<OrganizerDashboardStatsDto.EventPerformanceDto> topEvents = new ArrayList<>();

        for (Event e : allEvents) {
            long eventSold = 0;
            BigDecimal eventRev = BigDecimal.ZERO;
            long capacity = 0;

            if (e.getTicketTypes() != null) {
                for (TicketType tt : e.getTicketTypes()) {
                    eventSold += tt.getSoldCount();
                    eventRev = eventRev.add(tt.getTotalPrice().multiply(BigDecimal.valueOf(tt.getSoldCount())));
                    capacity += tt.getQuota();
                }
            }

            totalTicketsSold += eventSold;
            grossRevenue = grossRevenue.add(eventRev);

            topEvents.add(new OrganizerDashboardStatsDto.EventPerformanceDto(
                    e.getTitle(),
                    e.getCategory().name(),
                    eventSold,
                    capacity,
                    eventRev
            ));
        }

        long totalTickets = ticketRepository.count();
        long totalCheckedIn = ticketRepository.count(); // fallback
        double checkinRate = 0.0;
        if (totalTickets > 0) {
            long checkedIn = ticketRepository.findAll().stream().filter(t -> t.getStatus() == TicketStatus.USED).count();
            checkinRate = Math.round(((double) checkedIn / totalTickets) * 1000.0) / 10.0;
        }

        return new OrganizerDashboardStatsDto(
                totalEvents,
                activeEvents,
                totalTicketsSold,
                grossRevenue,
                checkinRate,
                topEvents
        );
    }

    @Transactional(readOnly = true)
    public AdminDashboardStatsDto getAdminStats() {
        long totalUsers = userRepository.count();
        long totalOrganizers = userRepository.findByRole(Role.ORGANIZER).size();
        long totalEvents = eventRepository.count();
        long totalOrders = orderRepository.count();

        List<Order> confirmedOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() == OrderStatus.CONFIRMED)
                .toList();

        BigDecimal grossVolume = confirmedOrders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalTickets = ticketRepository.count();
        long totalCheckins = checkinLogRepository.count();

        List<AdminDashboardStatsDto.RecentOrderDto> recent = orderRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(10)
                .map(o -> new AdminDashboardStatsDto.RecentOrderDto(
                        o.getOrderNumber(),
                        o.getContactEmail(),
                        o.getEvent().getTitle(),
                        o.getTotalAmount(),
                        o.getStatus().name()
                ))
                .toList();

        return new AdminDashboardStatsDto(
                totalUsers,
                totalOrganizers,
                totalEvents,
                totalOrders,
                grossVolume,
                totalTickets,
                totalCheckins,
                recent
        );
    }
}
