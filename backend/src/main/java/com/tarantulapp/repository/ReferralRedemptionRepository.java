package com.tarantulapp.repository;

import com.tarantulapp.entity.ReferralRedemption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReferralRedemptionRepository extends JpaRepository<ReferralRedemption, UUID> {
    boolean existsByRefereeUserId(UUID refereeUserId);

    long countByReferrerUserId(UUID referrerUserId);
}
