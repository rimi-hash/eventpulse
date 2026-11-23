package com.eventpulse.resale.model;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.users.model.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "resale_listings")
public class ResaleListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_user_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_user_id")
    private User buyer;

    @Column(name = "original_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "resale_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal resalePrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ResaleListingStatus status = ResaleListingStatus.ACTIVE;

    @Column(name = "fee_amount", precision = 12, scale = 2)
    private BigDecimal feeAmount;

    @Column(name = "total_buyer_amount", precision = 12, scale = 2)
    private BigDecimal totalBuyerAmount;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Column(name = "payout_status", length = 32)
    private String payoutStatus = "PENDING_SETTLEMENT";

    @Column(name = "razorpay_order_id", length = 64)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 64)
    private String razorpayPaymentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sold_at")
    private Instant soldAt;

    public ResaleListing() {
    }

    public ResaleListing(Ticket ticket, User seller, BigDecimal originalPrice, BigDecimal resalePrice) {
        if (resalePrice == null || originalPrice == null) {
            throw new BadRequestException("Prices cannot be null for resale listing");
        }
        if (resalePrice.compareTo(originalPrice) >= 0) {
            throw new BadRequestException("Anti-scalping policy violation: Resale price (" + resalePrice 
                    + ") must be strictly lower than the original ticket price (" + originalPrice + ")");
        }
        if (resalePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Resale price must be greater than zero");
        }
        this.ticket = ticket;
        this.ticket = ticket;
        this.seller = seller;
        this.originalPrice = originalPrice;
        this.resalePrice = resalePrice;
        this.feeAmount = resalePrice.multiply(BigDecimal.valueOf(0.05)).setScale(2, java.math.RoundingMode.HALF_UP);
        this.totalBuyerAmount = resalePrice.add(this.feeAmount);
        this.status = ResaleListingStatus.ACTIVE;
    }

    public BigDecimal getFeeAmount() {
        return feeAmount;
    }

    public void setFeeAmount(BigDecimal feeAmount) {
        this.feeAmount = feeAmount;
    }

    public BigDecimal getTotalBuyerAmount() {
        return totalBuyerAmount != null ? totalBuyerAmount : resalePrice;
    }

    public void setTotalBuyerAmount(BigDecimal totalBuyerAmount) {
        this.totalBuyerAmount = totalBuyerAmount;
    }

    public Instant getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public void setHoldExpiresAt(Instant holdExpiresAt) {
        this.holdExpiresAt = holdExpiresAt;
    }

    public String getPayoutStatus() {
        return payoutStatus;
    }

    public void setPayoutStatus(String payoutStatus) {
        this.payoutStatus = payoutStatus;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public User getSeller() {
        return seller;
    }

    public void setSeller(User seller) {
        this.seller = seller;
    }

    public User getBuyer() {
        return buyer;
    }

    public void setBuyer(User buyer) {
        this.buyer = buyer;
    }

    public BigDecimal getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(BigDecimal originalPrice) {
        this.originalPrice = originalPrice;
    }

    public BigDecimal getResalePrice() {
        return resalePrice;
    }

    public void setResalePrice(BigDecimal resalePrice) {
        if (resalePrice != null && originalPrice != null && resalePrice.compareTo(originalPrice) >= 0) {
            throw new BadRequestException("Anti-scalping policy violation: Resale price must be strictly lower than original price");
        }
        this.resalePrice = resalePrice;
        if (resalePrice != null) {
            this.feeAmount = resalePrice.multiply(BigDecimal.valueOf(0.05)).setScale(2, java.math.RoundingMode.HALF_UP);
            this.totalBuyerAmount = resalePrice.add(this.feeAmount);
        }
    }

    public ResaleListingStatus getStatus() {
        return status;
    }

    public void setStatus(ResaleListingStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getSoldAt() {
        return soldAt;
    }

    public void setSoldAt(Instant soldAt) {
        this.soldAt = soldAt;
    }
}
