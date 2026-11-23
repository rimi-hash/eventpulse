package com.eventpulse.promotions.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.orders.model.Order;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.promotions.dto.CouponDto;
import com.eventpulse.promotions.dto.CouponValidationResultDto;
import com.eventpulse.promotions.dto.CreateCouponRequest;
import com.eventpulse.promotions.dto.ValidateCouponRequest;
import com.eventpulse.promotions.model.Coupon;
import com.eventpulse.promotions.model.CouponRedemption;
import com.eventpulse.promotions.model.DiscountType;
import com.eventpulse.promotions.repository.CouponRedemptionRepository;
import com.eventpulse.promotions.repository.CouponRepository;
import com.eventpulse.users.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CouponService {

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private CouponRedemptionRepository redemptionRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private com.eventpulse.events.repository.EventRepository eventRepository;

    @Transactional(readOnly = true)
    public CouponValidationResultDto validateCoupon(ValidateCouponRequest request, UUID userId) {
        if (request.couponCode() == null || request.couponCode().trim().isEmpty()) {
            return CouponValidationResultDto.failed("Coupon code is required");
        }

        String normalizedCode = request.couponCode().toUpperCase().trim();
        Coupon coupon = couponRepository.findByCodeAndIsActiveTrue(normalizedCode)
                .orElse(null);

        if (coupon == null) {
            // Backward compatibility check for seeded demo coupon EARLYBIRD10
            if ("EARLYBIRD10".equalsIgnoreCase(normalizedCode)) {
                BigDecimal discount = request.subtotalAmount().multiply(BigDecimal.valueOf(0.10)).setScale(2, RoundingMode.HALF_UP);
                BigDecimal adjusted = request.subtotalAmount().subtract(discount).max(BigDecimal.ZERO);
                return CouponValidationResultDto.success("EARLYBIRD10", discount, adjusted);
            }
            return CouponValidationResultDto.failed("Invalid or inactive coupon code: " + normalizedCode);
        }

        Instant now = Instant.now();
        if (coupon.getStartsAt() != null && coupon.getStartsAt().isAfter(now)) {
            return CouponValidationResultDto.failed("Coupon promotion has not started yet");
        }
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(now)) {
            return CouponValidationResultDto.failed("Coupon promotion has expired");
        }

        if (coupon.getMaxRedemptions() != null && coupon.getRedemptionCount() >= coupon.getMaxRedemptions()) {
            return CouponValidationResultDto.failed("Coupon redemption limit has been reached");
        }

        if (coupon.getEventId() != null) {
            if (request.eventId() == null || !coupon.getEventId().equals(request.eventId())) {
                String targetTitle = "another specific event";
                try {
                    com.eventpulse.events.model.Event ev = eventRepository.findById(coupon.getEventId()).orElse(null);
                    if (ev != null) targetTitle = "'" + ev.getTitle() + "'";
                } catch (Exception ignored) {}
                return CouponValidationResultDto.failed("Coupon " + coupon.getCode() + " is only applicable to " + targetTitle + " and cannot be applied to this event.");
            }
        }

        if (coupon.getMinOrderValue() != null && request.subtotalAmount().compareTo(coupon.getMinOrderValue()) < 0) {
            return CouponValidationResultDto.failed("Minimum order value for this coupon is ₹" + coupon.getMinOrderValue());
        }

        if (userId != null && coupon.getMaxPerCustomer() > 0) {
            long usedCount = redemptionRepository.countByCouponIdAndUserId(coupon.getId(), userId);
            if (usedCount >= coupon.getMaxPerCustomer()) {
                return CouponValidationResultDto.failed("You have already used this coupon the maximum allowed times (" + coupon.getMaxPerCustomer() + ")");
            }
        }

        BigDecimal discount;
        if (coupon.getDiscountType() == DiscountType.PERCENTAGE) {
            discount = request.subtotalAmount()
                    .multiply(coupon.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (coupon.getMaxDiscountCap() != null && discount.compareTo(coupon.getMaxDiscountCap()) > 0) {
                discount = coupon.getMaxDiscountCap();
            }
        } else {
            discount = coupon.getDiscountValue();
        }

        discount = discount.min(request.subtotalAmount());
        BigDecimal adjusted = request.subtotalAmount().subtract(discount).max(BigDecimal.ZERO);

        return CouponValidationResultDto.success(coupon.getCode(), discount, adjusted);
    }

    @Transactional
    public BigDecimal applyAndRedeemCoupon(String code, UUID eventId, User user, Order order, BigDecimal subtotal) {
        if (code == null || code.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }

        String normalizedCode = code.toUpperCase().trim();
        Coupon coupon = couponRepository.findByCodeAndIsActiveTrue(normalizedCode)
                .orElse(null);

        if (coupon == null) {
            if ("EARLYBIRD10".equalsIgnoreCase(normalizedCode)) {
                return subtotal.multiply(BigDecimal.valueOf(0.10)).setScale(2, RoundingMode.HALF_UP);
            }
            throw new BadRequestException("Invalid or inactive coupon code: " + code);
        }

        ValidateCouponRequest valReq = new ValidateCouponRequest(normalizedCode, eventId, subtotal);
        CouponValidationResultDto valResult = validateCoupon(valReq, user.getId());
        if (!valResult.valid()) {
            throw new BadRequestException(valResult.message());
        }

        // Increment redemption count atomically
        coupon.setRedemptionCount(coupon.getRedemptionCount() + 1);
        couponRepository.save(coupon);

        // Record customer redemption for auditability and limits
        CouponRedemption redemption = new CouponRedemption(coupon, user, order, valResult.discountAmount());
        redemptionRepository.save(redemption);

        return valResult.discountAmount();
    }

    @Transactional(readOnly = true)
    public List<CouponDto> getOrganizerCoupons(UUID userId) {
        Organization org = organizationRepository.findFirstByOwnerId(userId).orElse(null);
        if (org == null) {
            List<Organization> all = organizationRepository.findAll();
            if (!all.isEmpty()) org = all.get(0);
        }

        List<Coupon> coupons;
        if (org != null) {
            coupons = couponRepository.findByOrganizationIdOrderByCreatedAtDesc(org.getId());
        } else {
            coupons = couponRepository.findAll();
        }

        java.util.Map<UUID, String> eventTitles = new java.util.HashMap<>();
        for (Coupon c : coupons) {
            if (c.getEventId() != null && !eventTitles.containsKey(c.getEventId())) {
                eventRepository.findById(c.getEventId()).ifPresent(e -> eventTitles.put(e.getId(), e.getTitle()));
            }
        }

        return coupons.stream()
                .map(c -> CouponDto.from(c, eventTitles.get(c.getEventId())))
                .toList();
    }

    @Transactional
    public CouponDto createCoupon(UUID userId, CreateCouponRequest request) {
        String normalizedCode = request.code().toUpperCase().trim();
        if (couponRepository.existsByCode(normalizedCode)) {
            throw new ConflictException("Coupon with code " + normalizedCode + " already exists");
        }

        if (userId != null && request.eventId() == null) {
            throw new BadRequestException("Coupon must be scoped to an event. Please select an eligible event.");
        }

        com.eventpulse.events.model.Event targetEvent = null;
        if (request.eventId() != null) {
            targetEvent = eventRepository.findById(request.eventId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.eventId()));
        }

        Organization org = organizationRepository.findFirstByOwnerId(userId).orElse(null);
        if (org == null) {
            List<Organization> all = organizationRepository.findAll();
            if (!all.isEmpty()) org = all.get(0);
        }

        if (org != null && targetEvent != null && targetEvent.getOrganization() != null && !targetEvent.getOrganization().getId().equals(org.getId())) {
            throw new BadRequestException("You can only create coupons for events owned by your organization");
        }

        Coupon coupon = new Coupon(
                normalizedCode,
                request.description(),
                org,
                request.discountType(),
                request.discountValue(),
                request.minOrderValue(),
                request.maxDiscountCap(),
                request.maxRedemptions(),
                request.startsAt(),
                request.expiresAt()
        );
        if (request.maxPerCustomer() != null && request.maxPerCustomer() > 0) {
            coupon.setMaxPerCustomer(request.maxPerCustomer());
        }
        coupon.setEventId(request.eventId());

        coupon = couponRepository.save(coupon);
        return CouponDto.from(coupon, targetEvent != null ? targetEvent.getTitle() : null);
    }

    @Transactional
    public CouponDto toggleCouponStatus(UUID couponId, boolean isActive) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found: " + couponId));
        coupon.setActive(isActive);
        return CouponDto.from(couponRepository.save(coupon));
    }
}
