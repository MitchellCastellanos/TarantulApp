package com.tarantulapp.repository;

import com.tarantulapp.entity.Photo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findByTarantulaIdOrderByCreatedAtDesc(UUID tarantulaId);
    Optional<Photo> findByIdAndTarantulaId(UUID id, UUID tarantulaId);
}
