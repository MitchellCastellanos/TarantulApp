package com.tarantulapp.repository;

import com.tarantulapp.entity.PhotoSpood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface PhotoSpoodRepository extends JpaRepository<PhotoSpood, UUID> {
    long countByPhotoId(UUID photoId);
    boolean existsByPhotoIdAndUserId(UUID photoId, UUID userId);
    Optional<PhotoSpood> findByPhotoIdAndUserId(UUID photoId, UUID userId);
    void deleteByPhotoIdAndUserId(UUID photoId, UUID userId);

    @Query("select s.photoId, count(s) from PhotoSpood s where s.photoId in :ids group by s.photoId")
    List<Object[]> countGroupedByPhotoIds(@Param("ids") Collection<UUID> ids);

    @Query("select distinct s.photoId from PhotoSpood s where s.photoId in :ids and s.userId = :userId")
    Set<UUID> findPhotoIdsSpoodedByUser(@Param("ids") Collection<UUID> ids, @Param("userId") UUID userId);
}
