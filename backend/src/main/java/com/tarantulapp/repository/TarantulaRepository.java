package com.tarantulapp.repository;

import com.tarantulapp.entity.Tarantula;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TarantulaRepository extends JpaRepository<Tarantula, UUID> {
    @EntityGraph(attributePaths = "species")
    List<Tarantula> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = "species")
    Page<Tarantula> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
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
            SELECT t.user_id, CAST(COUNT(*) AS bigint)
            FROM tarantulas t
            WHERE t.user_id IN (:userIds)
            GROUP BY t.user_id
            """, nativeQuery = true)
    List<Object[]> countGroupedByUserIdsNative(@Param("userIds") List<UUID> userIds);

    @Query("SELECT COUNT(t) FROM Tarantula t WHERE t.userId = :userId")
    long countForUserId(@Param("userId") UUID userId);
    @Query("select count(distinct t.species.id) from Tarantula t where t.userId = :userId and t.species is not null")
    long countDistinctSpeciesByUserId(UUID userId);

    @Query("select count(distinct t.species.id) from Tarantula t where t.userId = :userId and t.deceasedAt is null and t.species is not null")
    long countDistinctSpeciesAliveByUserId(@Param("userId") UUID userId);
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

    @Query("select s.scientificName from Tarantula t join t.species s where t.userId = :userId and t.deceasedAt is null and s is not null")
    List<String> findAliveScientificNamesByUserId(@Param("userId") UUID userId);

    @Query("select distinct lower(trim(s.habitatType)) from Tarantula t join t.species s "
            + "where t.userId = :userId and t.deceasedAt is null and s.habitatType is not null and trim(s.habitatType) <> ''")
    List<String> findDistinctAliveHabitatTypesLowerByUserId(@Param("userId") UUID userId);

    @Query("select lower(s.hobbyWorld), count(t) from Tarantula t join t.species s "
            + "where t.userId = :userId and t.deceasedAt is null and s.hobbyWorld is not null and trim(s.hobbyWorld) <> '' "
            + "group by lower(s.hobbyWorld)")
    List<Object[]> countAliveByHobbyWorld(@Param("userId") UUID userId);

    @Query("select count(t) from Tarantula t where t.userId = :userId and t.deceasedAt is null and lower(t.stage) = 'sling'")
    long countAliveSlingsByUserId(@Param("userId") UUID userId);

    @Query("select count(t) from Tarantula t where t.userId = :userId and t.deceasedAt is null "
            + "and t.currentSizeCm is not null and t.currentSizeCm >= :minCm")
    long countAliveAtLeastSizeCm(@Param("userId") UUID userId, @Param("minCm") BigDecimal minCm);

    @Query("select t.purchaseDate, t.createdAt from Tarantula t where t.userId = :userId and t.deceasedAt is null")
    List<Object[]> findAlivePurchaseDateAndCreatedAt(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Tarantula t SET t.isPublic = :isPublic WHERE t.userId = :userId")
    int setVisibilityByUserId(@Param("userId") UUID userId, @Param("isPublic") boolean isPublic);

    @EntityGraph(attributePaths = "species")
    @Query("""
            SELECT DISTINCT t FROM Tarantula t
            WHERE t.isPublic = true
              AND (
                (t.profilePhoto IS NOT NULL AND LENGTH(TRIM(t.profilePhoto)) > 0)
                OR EXISTS (SELECT 1 FROM Photo p WHERE p.tarantulaId = t.id)
              )
            ORDER BY COALESCE(t.spotlightAt, t.createdAt) DESC
            """)
    Page<Tarantula> findCommunitySpotlightCandidates(Pageable pageable);

    @Query("SELECT DISTINCT t.userId FROM Tarantula t")
    List<UUID> findDistinctUserIds();
}
