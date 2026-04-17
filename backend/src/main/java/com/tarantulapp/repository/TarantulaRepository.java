package com.tarantulapp.repository;

import com.tarantulapp.entity.Tarantula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TarantulaRepository extends JpaRepository<Tarantula, UUID> {
    List<Tarantula> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Orden estable: las 6 primeras son las del cupo Free cuando no hay Pro/prueba. */
    List<Tarantula> findByUserIdOrderByCreatedAtAscIdAsc(UUID userId);
    long countByUserId(UUID userId);
    Optional<Tarantula> findByShortId(String shortId);
    boolean existsByShortId(String shortId);
}
