package com.tarantulapp.repository;

import com.tarantulapp.entity.VendorBoostCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface VendorBoostCreditRepository extends JpaRepository<VendorBoostCredit, UUID> {

    long countByUserIdAndConsumedAtIsNull(UUID userId);

    @Query("""
            select c from VendorBoostCredit c
            where c.userId = :userId and c.consumedAt is null
            order by c.grantedAt asc
            """)
    Optional<VendorBoostCredit> findOldestAvailable(@Param("userId") UUID userId);

    boolean existsByReferralRedemptionId(UUID referralRedemptionId);
}
