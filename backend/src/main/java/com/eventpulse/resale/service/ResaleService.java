package com.eventpulse.resale.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.common.exception.UnauthorizedException;
import com.eventpulse.resale.dto.CreateResaleListingRequest;
import com.eventpulse.resale.dto.ResaleListingDto;
import com.eventpulse.resale.model.ResaleListing;
import com.eventpulse.resale.model.ResaleListingStatus;
import com.eventpulse.resale.repository.ResaleListingRepository;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.ticketing.model.TicketStatus;
import com.eventpulse.ticketing.model.TicketTransfer;
import com.eventpulse.ticketing.repository.TicketRepository;
import com.eventpulse.ticketing.repository.TicketTransferRepository;
import com.eventpulse.ticketing.service.TicketService;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ResaleService {

    @Autowired
    private ResaleListingRepository resaleListingRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketTransferRepository transferRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketService ticketService;

    @Transactional
    public ResaleListingDto createListing(UUID userId, CreateResaleListingRequest request) {
        Ticket ticket = ticketRepository.findById(request.ticketId())
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + request.ticketId()));

        if (!ticket.getCurrentOwner().getId().equals(userId)) {
            throw new UnauthorizedException("You can only list tickets that you own");
        }

        if (ticket.getStatus() != TicketStatus.ISSUED) {
            throw new BadRequestException("Ticket is not eligible for resale. Current status: " + ticket.getStatus());
        }

        if (ticket.getSession().getStartsAt().isBefore(Instant.now())) {
            throw new BadRequestException("Cannot list tickets for past or ongoing events");
        }

        if (resaleListingRepository.existsByTicketIdAndStatus(ticket.getId(), ResaleListingStatus.ACTIVE)) {
            throw new ConflictException("Ticket is already actively listed on the marketplace");
        }

        BigDecimal originalPrice = ticket.getTicketType().getTotalPrice();
        BigDecimal requestedPrice = request.resalePrice();

        // Enforce anti-scalping strict inequality: resalePrice < originalPrice
        if (requestedPrice.compareTo(originalPrice) >= 0) {
            throw new BadRequestException("Anti-Scalping Policy: Resale price (₹" + requestedPrice 
                    + ") must be strictly lower than the original ticket price (₹" + originalPrice + ")");
        }

        User seller = ticket.getCurrentOwner();
        ResaleListing listing = new ResaleListing(ticket, seller, originalPrice, requestedPrice);
        return ResaleListingDto.from(resaleListingRepository.save(listing));
    }

    @Transactional
    public ResaleListingDto cancelListing(UUID listingId, UUID userId) {
        ResaleListing listing = resaleListingRepository.findById(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Resale listing not found: " + listingId));

        if (!listing.getSeller().getId().equals(userId)) {
            throw new UnauthorizedException("Only the seller can withdraw this listing");
        }

        if (listing.getStatus() != ResaleListingStatus.ACTIVE) {
            throw new BadRequestException("Listing cannot be cancelled in status: " + listing.getStatus());
        }

        listing.setStatus(ResaleListingStatus.CANCELLED);
        return ResaleListingDto.from(resaleListingRepository.save(listing));
    }

    @Transactional(readOnly = true)
    public List<ResaleListingDto> getEventResaleListings(UUID eventId) {
        return resaleListingRepository.findByEventIdAndStatus(eventId, ResaleListingStatus.ACTIVE).stream()
                .map(ResaleListingDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ResaleListingDto> getMyListings(UUID userId) {
        return resaleListingRepository.findBySellerIdOrderByCreatedAtDesc(userId).stream()
                .map(ResaleListingDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ResaleListingDto> getAllActiveListings() {
        return resaleListingRepository.findByStatusOrderByCreatedAtDesc(ResaleListingStatus.ACTIVE).stream()
                .map(ResaleListingDto::from)
                .toList();
    }

    @Transactional
    public com.eventpulse.resale.dto.ResaleCheckoutResponse initiateResaleCheckout(UUID listingId, UUID buyerUserId) {
        ResaleListing listing = resaleListingRepository.findByIdWithLock(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Resale listing not found: " + listingId));

        Instant now = Instant.now();
        // Check if held by another buyer and hold has not expired
        if (listing.getStatus() == ResaleListingStatus.PAYMENT_PENDING && listing.getHoldExpiresAt() != null && listing.getHoldExpiresAt().isAfter(now)) {
            if (listing.getBuyer() != null && !listing.getBuyer().getId().equals(buyerUserId)) {
                throw new ConflictException("This resale listing is currently reserved by another buyer in checkout.");
            }
        } else if (listing.getStatus() != ResaleListingStatus.ACTIVE && listing.getStatus() != ResaleListingStatus.PAYMENT_PENDING) {
            throw new ConflictException("This resale listing is no longer available (status: " + listing.getStatus() + ")");
        }

        if (listing.getSeller().getId().equals(buyerUserId)) {
            throw new BadRequestException("You cannot purchase your own resale listing");
        }

        if (!listing.getTicket().getCurrentOwner().getId().equals(listing.getSeller().getId())) {
            throw new ConflictException("Ticket is no longer owned by the seller.");
        }

        User buyer = userRepository.findById(buyerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer user not found: " + buyerUserId));

        BigDecimal fee = listing.getResalePrice().multiply(BigDecimal.valueOf(0.05)).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal total = listing.getResalePrice().add(fee);
        Instant holdExpiresAt = now.plusSeconds(600); // 10 minutes hold

        String rzpOrderId = "rzp_order_resale_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        listing.setStatus(ResaleListingStatus.PAYMENT_PENDING);
        listing.setBuyer(buyer);
        listing.setFeeAmount(fee);
        listing.setTotalBuyerAmount(total);
        listing.setHoldExpiresAt(holdExpiresAt);
        listing.setRazorpayOrderId(rzpOrderId);
        resaleListingRepository.save(listing);

        Ticket ticket = listing.getTicket();
        return new com.eventpulse.resale.dto.ResaleCheckoutResponse(
                listing.getId(),
                ticket.getEvent().getTitle(),
                ticket.getSession().getSessionTitle(),
                ticket.getSeatLabel(),
                ticket.getTicketType().getName(),
                listing.getOriginalPrice(),
                listing.getResalePrice(),
                fee,
                total,
                "INR",
                rzpOrderId,
                "rzp_test_ToFUKFviPA02pH",
                holdExpiresAt
        );
    }

    @Transactional
    public ResaleListingDto confirmResalePurchase(UUID listingId, UUID buyerUserId, com.eventpulse.resale.dto.ResaleConfirmPaymentRequest request) {
        ResaleListing listing = resaleListingRepository.findByIdWithLock(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Resale listing not found: " + listingId));

        Instant now = Instant.now();
        if (listing.getStatus() == ResaleListingStatus.SOLD) {
            throw new ConflictException("This resale listing has already been purchased.");
        }

        if (listing.getStatus() == ResaleListingStatus.CANCELLED) {
            throw new BadRequestException("This resale listing was withdrawn by the seller.");
        }

        if (listing.getSeller().getId().equals(buyerUserId)) {
            throw new BadRequestException("You cannot purchase your own resale listing");
        }

        Ticket ticket = listing.getTicket();
        User seller = listing.getSeller();

        if (!ticket.getCurrentOwner().getId().equals(seller.getId())) {
            throw new ConflictException("Ticket is no longer owned by the seller.");
        }

        User buyer = userRepository.findById(buyerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer user not found: " + buyerUserId));

        // If held by another user and hold has not expired
        if (listing.getStatus() == ResaleListingStatus.PAYMENT_PENDING && listing.getBuyer() != null
                && !listing.getBuyer().getId().equals(buyerUserId)
                && listing.getHoldExpiresAt() != null && listing.getHoldExpiresAt().isAfter(now)) {
            throw new ConflictException("This resale listing is currently held by another buyer.");
        }

        // Rotate cryptographic QR credential so the old pass is permanently invalidated
        long newTimestamp = System.currentTimeMillis();
        UUID orderId = (ticket.getOrderItem() != null && ticket.getOrderItem().getOrder() != null)
                ? ticket.getOrderItem().getOrder().getId()
                : UUID.randomUUID();
        String payloadData = "EP:" + ticket.getTicketNumber() + ":" + orderId + ":" + newTimestamp;
        String newSignature = ticketService.signPayload(payloadData);
        String rotatedQrPayload = payloadData + ":" + newSignature;

        ticket.setQrCryptographicPayload(rotatedQrPayload);
        ticket.setCurrentOwner(buyer);
        ticket.setAttendeeName(buyer.getFullName());
        ticket.setAttendeeEmail(buyer.getEmail());
        ticketRepository.save(ticket);

        // Record transfer audit trail
        transferRepository.save(new TicketTransfer(ticket, seller, buyer));

        // Complete atomic listing transfer
        listing.setStatus(ResaleListingStatus.SOLD);
        listing.setBuyer(buyer);
        listing.setSoldAt(now);
        listing.setHoldExpiresAt(null);
        listing.setPayoutStatus("PENDING_SETTLEMENT");
        if (request != null && request.razorpayPaymentId() != null) {
            listing.setRazorpayPaymentId(request.razorpayPaymentId());
        } else {
            listing.setRazorpayPaymentId("pay_mock_" + UUID.randomUUID().toString().substring(0, 12));
        }
        listing = resaleListingRepository.save(listing);

        return ResaleListingDto.from(listing);
    }

    @Transactional
    public ResaleListingDto cancelResaleCheckout(UUID listingId, UUID buyerUserId) {
        ResaleListing listing = resaleListingRepository.findByIdWithLock(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Resale listing not found: " + listingId));

        if (listing.getStatus() == ResaleListingStatus.PAYMENT_PENDING) {
            listing.setStatus(ResaleListingStatus.ACTIVE);
            listing.setBuyer(null);
            listing.setHoldExpiresAt(null);
            listing = resaleListingRepository.save(listing);
        }

        return ResaleListingDto.from(listing);
    }

    @Transactional
    public ResaleListingDto purchaseResaleListing(UUID listingId, UUID buyerUserId) {
        return confirmResalePurchase(listingId, buyerUserId, null);
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 30000)
    @Transactional
    public void releaseExpiredHolds() {
        Instant now = Instant.now();
        List<ResaleListing> expiredListings = resaleListingRepository.findExpiredHolds(ResaleListingStatus.PAYMENT_PENDING, now);
        for (ResaleListing listing : expiredListings) {
            listing.setStatus(ResaleListingStatus.ACTIVE);
            listing.setBuyer(null);
            listing.setHoldExpiresAt(null);
            resaleListingRepository.save(listing);
        }
    }
}
