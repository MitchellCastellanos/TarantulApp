package com.tarantulapp.repository;

import com.tarantulapp.entity.Photo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findByTarantulaIdOrderByCreatedAtDesc(UUID tarantulaId);

    Page<Photo> findByTarantulaIdOrderByCreatedAtDesc(UUID tarantulaId, Pageable pageable);
    Optional<Photo> findByIdAndTarantulaId(UUID id, UUID tarantulaId);

    @Query("SELECT p FROM Photo p WHERE p.tarantulaId IN :tarantulaIds ORDER BY p.createdAt DESC")
    List<Photo> findByTarantulaIdInOrderByCreatedAtDesc(@Param("tarantulaIds") List<UUID> tarantulaIds);
}
