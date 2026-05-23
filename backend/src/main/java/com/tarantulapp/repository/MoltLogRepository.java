package com.tarantulapp.repository;

import com.tarantulapp.entity.MoltLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MoltLogRepository extends JpaRepository<MoltLog, UUID> {
    List<MoltLog> findByTarantulaIdOrderByMoltedAtDesc(UUID tarantulaId);
    Optional<MoltLog> findFirstByTarantulaIdOrderByMoltedAtDesc(UUID tarantulaId);
    @Query("select count(m) from MoltLog m where m.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);

    @Query("""
            select count(m) from MoltLog m
            where m.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)
            and m.moltedAt >= :from
            """)
    long countMoltsSince(@Param("userId") UUID userId, @Param("from") Instant from);

    @Query(value = """
            select date_trunc('week', m.molted_at) as wk, cast(count(*) as bigint)
            from molt_logs m
            inner join tarantulas t on t.id = m.tarantula_id
            where t.user_id = cast(:userId as uuid)
              and m.molted_at >= cast(:fromTs as timestamptz)
            group by wk
            order by wk
            """, nativeQuery = true)
    List<Object[]> countMoltsByWeekNative(@Param("userId") UUID userId, @Param("fromTs") Instant fromTs);

    @Query(value = """
            SELECT tarantula_id, molted_at FROM (
                SELECT m.tarantula_id AS tarantula_id, m.molted_at AS molted_at,
                       ROW_NUMBER() OVER (PARTITION BY m.tarantula_id ORDER BY m.molted_at DESC) AS rn
                FROM molt_logs m
                WHERE m.tarantula_id IN (:ids)
            ) x WHERE x.rn = 1
            """, nativeQuery = true)
    List<Object[]> findLatestMoltRowsByTarantulaIds(@Param("ids") Collection<UUID> ids);

    @Query(value = """
            select cast(count(m.id) as bigint), max(m.molted_at)
            from molt_logs m
            inner join tarantulas t on t.id = m.tarantula_id
            where t.species_id = :speciesId
            """, nativeQuery = true)
    Object[] aggregateCommunityMoltsBySpeciesId(@Param("speciesId") int speciesId);
}
