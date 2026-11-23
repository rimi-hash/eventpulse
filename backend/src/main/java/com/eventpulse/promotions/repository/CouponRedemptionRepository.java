package com.eventpulse.promotions.repository;

import com.eventpulse.promotions.model.CouponRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, UUID> {
    long countByCouponIdAndUserId(UUID couponId, UUID userId);
    List<CouponRedemption> findByCouponId(UUID couponId);
    List<CouponRedemption> findByUserId(UUID userId);
}
