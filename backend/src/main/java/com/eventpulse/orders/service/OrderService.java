package com.eventpulse.orders.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.events.model.Event;
import com.eventpulse.events.model.EventSession;
import com.eventpulse.inventory.model.InventoryStatus;
import com.eventpulse.inventory.model.SeatInventory;
import com.eventpulse.inventory.repository.SeatInventoryRepository;
import com.eventpulse.orders.dto.CreateOrderRequest;
import com.eventpulse.orders.dto.OrderResponseDto;
import com.eventpulse.orders.model.IdempotencyKeyRecord;
import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.model.OrderItem;
import com.eventpulse.orders.model.OrderStatus;
import com.eventpulse.orders.repository.IdempotencyKeyRepository;
import com.eventpulse.orders.repository.OrderItemRepository;
import com.eventpulse.orders.repository.OrderRepository;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private SeatInventoryRepository inventoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IdempotencyKeyRepository idempotencyKeyRepository;

    @Autowired
    private com.eventpulse.promotions.service.CouponService couponService;

    @Transactional
    public OrderResponseDto createOrder(CreateOrderRequest request, UUID userId, String idempotencyKey) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // Check active hold items
        List<SeatInventory> heldItems = inventoryRepository.findByHoldSessionToken(request.holdSessionToken());
        if (heldItems.isEmpty()) {
            throw new BadRequestException("No active hold found for token: " + request.holdSessionToken());
        }

        Instant now = Instant.now();
        for (SeatInventory inv : heldItems) {
            if (!userId.equals(inv.getHoldUserId())) {
                throw new UnauthorizedException("Hold session token does not belong to the current user");
            }
            if (inv.getHoldExpiresAt() == null || inv.getHoldExpiresAt().isBefore(now)) {
                throw new ConflictException("Seat hold has expired. Please select your seats again.");
            }
            if (inv.getStatus() != InventoryStatus.HELD) {
                throw new ConflictException("Seat inventory is no longer held.");
            }
        }

        SeatInventory first = heldItems.get(0);
        Event event = first.getSession().getEvent();
        EventSession session = first.getSession();

        // Authoritative backend pricing calculation
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal fees = BigDecimal.ZERO;
        BigDecimal taxes = BigDecimal.ZERO;

        for (SeatInventory inv : heldItems) {
            subtotal = subtotal.add(inv.getTicketType().getBasePrice());
            fees = fees.add(inv.getTicketType().getServiceFee());
            taxes = taxes.add(inv.getTicketType().getTaxAmount());
        }

        BigDecimal discount = BigDecimal.ZERO;
        if (request.couponCode() != null && !request.couponCode().trim().isEmpty()) {
            discount = couponService.applyAndRedeemCoupon(request.couponCode(), event.getId(), user, null, subtotal);
        }

        BigDecimal total = subtotal.add(fees).add(taxes).subtract(discount).max(BigDecimal.ZERO);

        String orderNumber = "EP-" + (1900 + Calendar.getInstance().get(Calendar.YEAR)) + "-"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

        Order order = new Order(
                orderNumber,
                user,
                event,
                session,
                subtotal,
                fees,
                taxes,
                total,
                request.contactEmail().trim(),
                request.contactPhone().trim()
        );
        order.setDiscountAmount(discount);
        order.setStatus(OrderStatus.PAYMENT_PENDING);

        order = orderRepository.save(order);

        List<OrderItem> orderItems = new ArrayList<>();
        for (SeatInventory inv : heldItems) {
            String seatLabel = inv.getSeat() != null
                    ? inv.getSeat().getSeatLabel()
                    : inv.getTicketType().getName() + " Pass";

            OrderItem item = new OrderItem(
                    order,
                    inv.getTicketType(),
                    inv,
                    inv.getTicketType().getTotalPrice(),
                    seatLabel
            );
            orderItems.add(orderItemRepository.save(item));

            // Transition inventory to PAYMENT_PENDING
            inv.setStatus(InventoryStatus.PAYMENT_PENDING);
        }
        inventoryRepository.saveAll(heldItems);
        order.setItems(orderItems);

        // Record idempotency key if provided
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            IdempotencyKeyRecord record = new IdempotencyKeyRecord(
                    idempotencyKey,
                    userId,
                    "/api/v1/orders",
                    order.getOrderNumber(),
                    Instant.now().plusSeconds(86400)
            );
            record.setStatus("COMPLETED");
            record.setResponseCode(201);
            idempotencyKeyRepository.save(record);
        }

        return toDto(order);
    }

    @Transactional(readOnly = true)
    public OrderResponseDto getOrder(UUID orderId, UUID userId, Role role) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getUser().getId().equals(userId) && role == Role.CUSTOMER) {
            throw new UnauthorizedException("You are not authorized to view this order");
        }

        return toDto(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDto> getMyOrders(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public OrderResponseDto cancelOrder(UUID orderId, UUID userId, Role role) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getUser().getId().equals(userId) && role == Role.CUSTOMER) {
            throw new UnauthorizedException("You are not authorized to cancel this order");
        }

        if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Order cannot be cancelled in state: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        order = orderRepository.save(order);

        // Release associated inventories back to AVAILABLE
        for (OrderItem item : order.getItems()) {
            SeatInventory inv = item.getInventory();
            inv.setStatus(InventoryStatus.AVAILABLE);
            inv.setHoldUserId(null);
            inv.setHoldSessionToken(null);
            inv.setHoldExpiresAt(null);
            inventoryRepository.save(inv);
        }

        return toDto(order);
    }

    @Transactional
    public OrderResponseDto applyCouponToOrder(UUID orderId, String couponCode, UUID userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Unauthorized to modify this order");
        }

        if (order.getStatus() != OrderStatus.PAYMENT_PENDING) {
            throw new BadRequestException("Coupons can only be applied to orders in PAYMENT_PENDING status");
        }

        BigDecimal discount = couponService.applyAndRedeemCoupon(couponCode, order.getEvent().getId(), order.getUser(), order, order.getSubtotalAmount());
        order.setDiscountAmount(discount);
        BigDecimal newTotal = order.getSubtotalAmount()
                .add(order.getServiceFeeAmount())
                .add(order.getTaxAmount())
                .subtract(discount)
                .max(BigDecimal.ZERO);
        order.setTotalAmount(newTotal);
        order = orderRepository.save(order);

        return toDto(order);
    }

    public OrderResponseDto toDto(Order order) {
        List<OrderResponseDto.OrderItemDto> itemDtos = order.getItems().stream()
                .map(item -> new OrderResponseDto.OrderItemDto(
                        item.getId(),
                        item.getTicketType().getId(),
                        item.getTicketType().getName(),
                        item.getUnitPrice(),
                        item.getSeatLabel()
                ))
                .toList();

        return new OrderResponseDto(
                order.getId(),
                order.getOrderNumber(),
                order.getUser().getId(),
                order.getUser().getFullName(),
                order.getEvent().getId(),
                order.getEvent().getTitle(),
                order.getEvent().getBannerUrl(),
                order.getSession().getId(),
                order.getSession().getSessionTitle(),
                order.getSession().getStartsAt(),
                order.getEvent().getVenue().getName(),
                order.getEvent().getVenue().getCity(),
                order.getStatus(),
                order.getCurrency(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getServiceFeeAmount(),
                order.getTaxAmount(),
                order.getTotalAmount(),
                order.getContactEmail(),
                order.getContactPhone(),
                itemDtos,
                order.getCreatedAt()
        );
    }
}
