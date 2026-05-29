package com.tarantulapp.repository;

import com.tarantulapp.entity.Passport;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
