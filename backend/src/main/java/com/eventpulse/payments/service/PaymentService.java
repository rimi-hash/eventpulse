package com.eventpulse.payments.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.events.model.TicketType;
import com.eventpulse.events.repository.TicketTypeRepository;
import com.eventpulse.inventory.model.InventoryStatus;
import com.eventpulse.inventory.model.SeatInventory;
import com.eventpulse.inventory.repository.SeatInventoryRepository;
import com.eventpulse.notifications.model.NotificationRecord;
import com.eventpulse.notifications.repository.NotificationRepository;
import com.eventpulse.orders.model.Order;
import com.eventpulse.orders.model.OrderItem;
import com.eventpulse.orders.model.OrderStatus;
import com.eventpulse.orders.repository.OrderRepository;
import com.eventpulse.payments.dto.*;
import com.eventpulse.payments.model.Payment;
import com.eventpulse.payments.model.PaymentProvider;
import com.eventpulse.payments.model.PaymentStatus;
import com.eventpulse.payments.repository.PaymentRepository;
import com.eventpulse.payments.repository.WebhookEventRepository;
import com.eventpulse.ticketing.service.TicketService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private SeatInventoryRepository inventoryRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private RazorpayService razorpayService;

    @Autowired
    private WebhookEventRepository webhookEventRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Transactional
    public PaymentIntentResponse createIntent(PaymentIntentRequest request, UUID userId, String idempotencyKey) {
        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.orderId()));

        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to pay for this order");
        }

        if (order.getStatus() != OrderStatus.PAYMENT_PENDING && order.getStatus() != OrderStatus.CREATED) {
            throw new BadRequestException("Order is not in a payable state: " + order.getStatus());
        }

        PaymentProvider provider = request.provider() != null ? request.provider() : PaymentProvider.MOCK;
        String intentId = "pi_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String clientSecret = intentId + "_secret_" + UUID.randomUUID().toString().substring(0, 8);

        Payment payment = new Payment(
                order,
                provider,
                order.getTotalAmount(),
                order.getCurrency(),
                idempotencyKey
        );
        payment.setGatewayPaymentIntentId(intentId);
        payment.setPaymentMethod(request.paymentMethod() != null ? request.paymentMethod() : "CARD");
        payment = paymentRepository.save(payment);

        return new PaymentIntentResponse(
                payment.getId(),
                order.getId(),
                provider,
                clientSecret,
                intentId,
                order.getTotalAmount(),
                order.getCurrency(),
                payment.getPaymentMethod()
        );
    }

    @Transactional
    public PaymentResponseDto confirmPayment(ConfirmPaymentRequest request, UUID userId) {
        Payment payment = paymentRepository.findById(request.paymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment attempt not found: " + request.paymentId()));

        Order order = payment.getOrder();
        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to confirm this payment");
        }

        // Idempotency check: if already successful, return existing confirmation
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return toDto(payment, null);
        }

        if (request.simulateFailure()) {
            String failureMsg = request.failureReason() != null ? request.failureReason() : "Card declined: Insufficient funds or test card failure";
            payment.setStatus(PaymentStatus.FAILED);
            payment.setRawGatewayPayload("{\"error\": \"" + failureMsg + "\"}");
            payment = paymentRepository.save(payment);

            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);

            // Release inventory back to AVAILABLE
            for (OrderItem item : order.getItems()) {
                SeatInventory inv = item.getInventory();
                inv.setStatus(InventoryStatus.AVAILABLE);
                inv.setHoldUserId(null);
                inv.setHoldSessionToken(null);
                inv.setHoldExpiresAt(null);
                inventoryRepository.save(inv);
            }

            notificationRepository.save(new NotificationRecord(
                    userId,
                    "Payment Failed",
                    "Payment for order " + order.getOrderNumber() + " failed: " + failureMsg + ". Held seats have been released.",
                    "ALERT"
            ));

            return toDto(payment, failureMsg);
        }

        // Process successful payment
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setConfirmedAt(Instant.now());
        payment.setGatewayTransactionId("tx_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        payment = paymentRepository.save(payment);

        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);

        // Mark inventory as SOLD and increment soldCount on TicketTypes
        for (OrderItem item : order.getItems()) {
            SeatInventory inv = item.getInventory();
            inv.setStatus(InventoryStatus.SOLD);
            inventoryRepository.save(inv);

            TicketType tt = item.getTicketType();
            tt.setSoldCount(tt.getSoldCount() + 1);
            ticketTypeRepository.save(tt);
        }

        // Generate cryptographic digital tickets
        ticketService.issueTicketsForOrder(order);

        // Create user confirmation notification
        notificationRepository.save(new NotificationRecord(
                userId,
                "Booking Confirmed!",
                "Your tickets for " + order.getEvent().getTitle() + " (Order " + order.getOrderNumber() + ") are confirmed and available in your wallet.",
                "SUCCESS"
        ));

        return toDto(payment, null);
    }

    @Transactional
    public RazorpayOrderResponse createRazorpayOrder(UUID orderId, UUID userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to initiate payment for this order");
        }

        if (order.getStatus() != OrderStatus.PAYMENT_PENDING && order.getStatus() != OrderStatus.CREATED) {
            throw new BadRequestException("Order is not in a payable state: " + order.getStatus());
        }

        // Create or reuse pending payment record for this order
        Payment payment = new Payment(
                order,
                PaymentProvider.RAZORPAY,
                order.getTotalAmount(),
                "INR",
                "rzp-ord-" + UUID.randomUUID().toString().substring(0, 8)
        );
        payment.setPaymentMethod("RAZORPAY_CHECKOUT");
        payment = paymentRepository.save(payment);

        return razorpayService.createRazorpayOrder(order, payment);
    }

    @Transactional
    public PaymentResponseDto verifyAndConfirmRazorpay(RazorpayVerifyRequest request, UUID userId) {
        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.orderId()));

        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to confirm this payment");
        }

        Payment payment = paymentRepository.findById(request.paymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment attempt not found: " + request.paymentId()));

        // Idempotency: If already confirmed, return current state without reissuing tickets
        if (order.getStatus() == OrderStatus.CONFIRMED && payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("Order {} and payment {} already confirmed. Returning existing confirmation.", order.getId(), payment.getId());
            return toDto(payment, null);
        }

        // Cryptographic HMAC SHA256 Signature Verification
        boolean isValidSignature = razorpayService.verifyPaymentSignature(
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature()
        );

        if (!isValidSignature) {
            log.warn("Invalid Razorpay payment signature for order {} with payment ID {}", order.getId(), request.razorpayPaymentId());
            payment.setStatus(PaymentStatus.FAILED);
            payment.setRawGatewayPayload("{\"error\": \"Invalid Razorpay payment signature\"}");
            paymentRepository.save(payment);
            throw new BadRequestException("Invalid payment signature. Razorpay verification rejected.");
        }

        // Reconcile successful payment
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setGatewayTransactionId(request.razorpayPaymentId());
        payment.setConfirmedAt(Instant.now());
        payment = paymentRepository.save(payment);

        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);

        // Mark inventory as SOLD and increment soldCount
        for (OrderItem item : order.getItems()) {
            SeatInventory inv = item.getInventory();
            inv.setStatus(InventoryStatus.SOLD);
            inventoryRepository.save(inv);

            TicketType tt = item.getTicketType();
            tt.setSoldCount(tt.getSoldCount() + 1);
            ticketTypeRepository.save(tt);
        }

        // Issue cryptographic QR passes
        ticketService.issueTicketsForOrder(order);

        notificationRepository.save(new NotificationRecord(
                userId,
                "Booking Confirmed via Razorpay!",
                "Payment of ₹" + order.getTotalAmount() + " verified successfully (Ref: " + request.razorpayPaymentId() + "). Tickets are in your wallet.",
                "SUCCESS"
        ));

        log.info("Successfully reconciled order {} with verified Razorpay payment {}", order.getOrderNumber(), request.razorpayPaymentId());
        return toDto(payment, null);
    }

    @Transactional
    public String handleRazorpayWebhook(String rawPayload, String signatureHeader) {
        if (!razorpayService.verifyWebhookSignature(rawPayload, signatureHeader)) {
            log.warn("Rejected Razorpay webhook: invalid HMAC signature header");
            throw new BadRequestException("Invalid Razorpay webhook signature");
        }

        try {
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(rawPayload);
            String eventType = rootNode.path("event").asText("");
            String eventId = rootNode.path("id").asText("");

            if (eventId.isEmpty()) {
                eventId = "evt_" + UUID.nameUUIDFromBytes(rawPayload.getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
            }

            // Deduplication: if event already processed, acknowledge safely
            if (webhookEventRepository.existsByEventId(eventId)) {
                log.info("Webhook event {} already processed. Acknowledging with safe no-op.", eventId);
                return "Event already processed";
            }

            log.info("Processing Razorpay webhook event: {} (id: {})", eventType, eventId);

            if ("order.paid".equals(eventType) || "payment.captured".equals(eventType)) {
                com.fasterxml.jackson.databind.JsonNode entityNode = rootNode.path("payload").path("payment").path("entity");
                if (entityNode.isMissingNode()) {
                    entityNode = rootNode.path("payload").path("order").path("entity");
                }

                String rzpOrderId = entityNode.path("order_id").asText("");
                String rzpPaymentId = entityNode.path("id").asText("");
                String appOrderIdStr = entityNode.path("notes").path("orderId").asText("");

                if (!appOrderIdStr.isEmpty()) {
                    try {
                        UUID appOrderId = UUID.fromString(appOrderIdStr);
                        Order order = orderRepository.findById(appOrderId).orElse(null);
                        if (order != null && order.getStatus() != OrderStatus.CONFIRMED) {
                            order.setStatus(OrderStatus.CONFIRMED);
                            orderRepository.save(order);

                            for (OrderItem item : order.getItems()) {
                                SeatInventory inv = item.getInventory();
                                inv.setStatus(InventoryStatus.SOLD);
                                inventoryRepository.save(inv);

                                TicketType tt = item.getTicketType();
                                tt.setSoldCount(tt.getSoldCount() + 1);
                                ticketTypeRepository.save(tt);
                            }
                            ticketService.issueTicketsForOrder(order);
                            log.info("Reconciled order {} via webhook event {}", order.getOrderNumber(), eventId);
                        }
                    } catch (Exception ex) {
                        log.warn("Webhook processing for order {} failed: {}", appOrderIdStr, ex.getMessage());
                    }
                }
            }

            webhookEventRepository.save(new com.eventpulse.payments.model.WebhookEventRecord(
                    eventId,
                    eventType,
                    "Processed: " + eventType
            ));

            return "Webhook processed successfully";
        } catch (Exception ex) {
            log.error("Failed to parse Razorpay webhook payload", ex);
            throw new BadRequestException("Malformed Razorpay webhook payload: " + ex.getMessage());
        }
    }

    public PaymentResponseDto toDto(Payment payment, String failureReason) {
        return new PaymentResponseDto(
                payment.getId(),
                payment.getOrder().getId(),
                payment.getOrder().getOrderNumber(),
                payment.getGatewayProvider(),
                payment.getGatewayTransactionId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getPaymentMethod(),
                payment.getConfirmedAt(),
                failureReason
        );
    }
}
