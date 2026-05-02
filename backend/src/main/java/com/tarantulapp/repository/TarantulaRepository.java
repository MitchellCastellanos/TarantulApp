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
    long countByUserIdAndDeceasedAtIsNull(UUID userId);

    /**
     * Native count per owner — avoids edge cases with derived queries + UUID on some PG/Hibernate combos.
     * Returns one row per user_id that has at least one tarantula.
     */
    @Query(value = """
            SELECT t.user_id, COUNT(*)::bigint
            FROM tarantulas t
            WHERE t.user_id IN (:userIds)
            GROUP BY t.user_id
            """, nativeQuery = true)
    List<Object[]> countGroupedByUserIdsNative(@Param("userIds") List<UUID> userIds);

    @Query("SELECT COUNT(t) FROM Tarantula t WHERE t.userId = :userId")
    long countForUserId(@Param("userId") UUID userId);
    @Query("select count(distinct t.species.id) from Tarantula t where t.userId = :userId and t.species is not null")
    long countDistinctSpeciesByUserId(UUID userId);
    Optional<Tarantula> findByShortId(String shortId);
    boolean existsByShortId(String shortId);

    @Query("select distinct t from Tarantula t left join fetch t.species where t.id in :ids")
    List<Tarantula> findAllWithSpeciesByIdIn(@Param("ids") List<UUID> ids);

    @Query(value = """
            select t.id, t.name, t.short_id, max(f.fed_at) as last_fed
            from tarantulas t
            left join feeding_logs f on f.tarantula_id = t.id
               and (f.accepted is null or f.accepted = true)
            where t.user_id = cast(:userId as uuid) and t.deceased_at is null
            group by t.id, t.name, t.short_id
            order by last_fed nulls first, last_fed asc
            limit 25
            """, nativeQuery = true)
    List<Object[]> findFeedingAttentionRows(@Param("userId") UUID userId);
}
