package com.tarantulapp.repository;

import com.tarantulapp.entity.BetaApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BetaApplicationRepository extends JpaRepository<BetaApplication, UUID> {
    List<BetaApplication> findByStatusOrderByCreatedAtDesc(String status);
    List<BetaApplication> findAllByOrderByCreatedAtDesc();
    Optional<BetaApplication> findFirstByEmailIgnoreCaseAndStatusOrderByReviewedAtDesc(String email, String status);
}
