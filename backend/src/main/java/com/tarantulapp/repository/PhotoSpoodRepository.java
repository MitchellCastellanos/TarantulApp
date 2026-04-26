package com.tarantulapp.repository;

import com.tarantulapp.entity.PhotoSpood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PhotoSpoodRepository extends JpaRepository<PhotoSpood, UUID> {
    long countByPhotoId(UUID photoId);
    boolean existsByPhotoIdAndUserId(UUID photoId, UUID userId);
    Optional<PhotoSpood> findByPhotoIdAndUserId(UUID photoId, UUID userId);
    void deleteByPhotoIdAndUserId(UUID photoId, UUID userId);
}
