package com.tarantulapp.repository;

import com.tarantulapp.entity.ActivityPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface ActivityPostRepository extends JpaRepository<ActivityPost, UUID> {
    Page<ActivityPost> findByVisibilityAndHiddenAtIsNullOrderByCreatedAtDesc(String visibility, Pageable pageable);

    Page<ActivityPost> findByAuthorUserIdOrderByCreatedAtDesc(UUID authorUserId, Pageable pageable);
    long countByAuthorUserIdAndCreatedAtAfter(UUID authorUserId, Instant createdAt);
}
