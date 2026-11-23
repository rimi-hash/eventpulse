package com.eventpulse.organizations.repository;

import com.eventpulse.organizations.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findBySlug(String slug);
    List<Organization> findByOwnerId(UUID ownerId);
    Optional<Organization> findFirstByOwnerId(UUID ownerId);
    List<Organization> findByVerificationStatus(String verificationStatus);
}
