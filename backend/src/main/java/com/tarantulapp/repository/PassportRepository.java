package com.tarantulapp.repository;

import com.tarantulapp.entity.Passport;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PassportRepository extends JpaRepository<Passport, UUID> {

    @EntityGraph(attributePaths = "species")
    Optional<Passport> findByShortId(String shortId);

    boolean existsByShortId(String shortId);

    @EntityGraph(attributePaths = "species")
    List<Passport> findByBatchIdOrderByCreatedAtDesc(UUID batchId);

    long countByBatchIdAndClaimedAtIsNull(UUID batchId);

    long countByBatchIdAndClaimedAtIsNotNull(UUID batchId);

    long countByCreatedByUserId(UUID userId);

    @EntityGraph(attributePaths = "species")
    List<Passport> findByCreatedByUserIdOrderByCreatedAtDesc(UUID createdByUserId);

    /** Distinct issuers that have created at least one passport (admin labels overview). */
    @Query("select distinct p.createdByUserId from Passport p where p.createdByUserId is not null")
    List<UUID> findDistinctIssuerIds();

    /** Claimed passports older than {@code cutoff} that the 2h alert job has not processed yet. */
    List<Passport> findByClaimedAtIsNotNullAndClaimedAtBeforeAndClaimPendingAlertSentAtIsNull(Instant cutoff);
}
