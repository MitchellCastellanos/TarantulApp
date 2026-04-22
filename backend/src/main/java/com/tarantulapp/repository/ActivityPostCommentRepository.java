package com.tarantulapp.repository;

import com.tarantulapp.entity.ActivityPostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityPostCommentRepository extends JpaRepository<ActivityPostComment, UUID> {
    long countByPostIdAndHiddenAtIsNull(UUID postId);
    List<ActivityPostComment> findByPostIdAndHiddenAtIsNullOrderByCreatedAtAsc(UUID postId);
}
