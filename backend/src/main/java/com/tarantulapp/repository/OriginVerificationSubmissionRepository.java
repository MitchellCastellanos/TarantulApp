package com.tarantulapp.repository;

import com.tarantulapp.entity.OriginVerificationSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OriginVerificationSubmissionRepository extends JpaRepository<OriginVerificationSubmission, UUID> {
    Optional<OriginVerificationSubmission> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    List<OriginVerificationSubmission> findTop50ByStatusOrderByCreatedAtDesc(String status);

    List<OriginVerificationSubmission> findTop50ByOrderByCreatedAtDesc();
}
