package com.eventpulse.orders.repository;

import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.model.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByOrderNumber(String orderNumber);
    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Order> findByEventIdOrderByCreatedAtDesc(UUID eventId);
    long countByEventIdAndStatus(UUID eventId, OrderStatus status);
}
