package com.tarantulapp.repository;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByPublicHandleIgnoreCase(String publicHandle);
    boolean existsByPublicHandleIgnoreCase(String publicHandle);
    boolean existsByPublicHandleIgnoreCaseAndIdNot(String publicHandle, UUID id);
    long countByCreatedAtAfter(LocalDateTime from);
    List<User> findTop10ByOrderByCreatedAtDesc();
    List<User> findByPlanAndTrialEndsAtBetween(
            UserPlan plan,
            LocalDateTime from,
            LocalDateTime to
    );
}
