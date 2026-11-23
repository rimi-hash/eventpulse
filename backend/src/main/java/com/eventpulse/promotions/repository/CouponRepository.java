package com.eventpulse.promotions.repository;

import com.eventpulse.promotions.model.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, UUID> {
    Optional<Coupon> findByCode(String code);
    Optional<Coupon> findByCodeAndIsActiveTrue(String code);
    List<Coupon> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    boolean existsByCode(String code);
}
