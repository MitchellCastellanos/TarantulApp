package com.tarantulapp.repository;

import com.tarantulapp.entity.ActivityPostLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ActivityPostLikeRepository extends JpaRepository<ActivityPostLike, UUID> {
    long countByPostId(UUID postId);
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);
    Optional<ActivityPostLike> findByPostIdAndUserId(UUID postId, UUID userId);
    void deleteByPostIdAndUserId(UUID postId, UUID userId);
}
