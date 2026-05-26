package com.tarantulapp.repository;

import com.tarantulapp.entity.TarantulaSpood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface TarantulaSpoodRepository extends JpaRepository<TarantulaSpood, UUID> {
    long countByTarantulaId(UUID tarantulaId);
    boolean existsByTarantulaIdAndUserId(UUID tarantulaId, UUID userId);
    Optional<TarantulaSpood> findByTarantulaIdAndUserId(UUID tarantulaId, UUID userId);
    void deleteByTarantulaIdAndUserId(UUID tarantulaId, UUID userId);

    @Query("select s.tarantulaId, count(s) from TarantulaSpood s where s.tarantulaId in :ids group by s.tarantulaId")
    List<Object[]> countGroupedByTarantulaIds(@Param("ids") Collection<UUID> ids);

    @Query("select distinct s.tarantulaId from TarantulaSpood s where s.tarantulaId in :ids and s.userId = :userId")
    Set<UUID> findTarantulaIdsSpoodedByUser(@Param("ids") Collection<UUID> ids, @Param("userId") UUID userId);
}
