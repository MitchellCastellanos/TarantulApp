package com.tarantulapp.repository;

import com.tarantulapp.entity.Tarantula;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TarantulaRepository extends JpaRepository<Tarantula, UUID> {
    List<Tarantula> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Tarantula> findTop24ByUserIdAndIsPublicTrueOrderByCreatedAtDesc(UUID userId);

    /** Orden estable: las 6 primeras son las del cupo Free cuando no hay Pro/prueba. */
    List<Tarantula> findByUserIdOrderByCreatedAtAscIdAsc(UUID userId);
    long countByUserId(UUID userId);
    @Query("select count(distinct t.species.id) from Tarantula t where t.userId = :userId and t.species is not null")
    long countDistinctSpeciesByUserId(UUID userId);
    Optional<Tarantula> findByShortId(String shortId);
    boolean existsByShortId(String shortId);

    @Query("select distinct t from Tarantula t left join fetch t.species where t.id in :ids")
    List<Tarantula> findAllWithSpeciesByIdIn(@Param("ids") List<UUID> ids);
}
