package com.tarantulapp.repository;

import com.tarantulapp.entity.ActivityPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityPostLikeRepository extends JpaRepository<ActivityPostLike, UUID> {
    long countByPostId(UUID postId);
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);
    Optional<ActivityPostLike> findByPostIdAndUserId(UUID postId, UUID userId);
    List<ActivityPostLike> findByPostIdOrderByCreatedAtDesc(UUID postId, Pageable pageable);
    void deleteByPostIdAndUserId(UUID postId, UUID userId);
}
