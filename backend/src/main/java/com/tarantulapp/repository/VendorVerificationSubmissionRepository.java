package com.tarantulapp.repository;

import com.tarantulapp.entity.VendorVerificationSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorVerificationSubmissionRepository extends JpaRepository<VendorVerificationSubmission, UUID> {
    Optional<VendorVerificationSubmission> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    List<VendorVerificationSubmission> findTop50ByStatusOrderByCreatedAtDesc(String status);

    List<VendorVerificationSubmission> findTop50ByOrderByCreatedAtDesc();
}
