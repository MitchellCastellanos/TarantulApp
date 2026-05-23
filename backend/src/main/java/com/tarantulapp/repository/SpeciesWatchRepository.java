package com.tarantulapp.repository;

import com.tarantulapp.entity.SpeciesWatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpeciesWatchRepository extends JpaRepository<SpeciesWatch, UUID> {

    List<SpeciesWatch> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<SpeciesWatch> findByUserIdAndSpeciesId(UUID userId, Integer speciesId);

    boolean existsByUserIdAndSpeciesId(UUID userId, Integer speciesId);

    List<SpeciesWatch> findBySpeciesId(Integer speciesId);

    long countByUserId(UUID userId);

    @Modifying
    @Query("delete from SpeciesWatch w where w.userId = :userId and w.speciesId = :speciesId")
    int deleteByUserIdAndSpeciesId(@Param("userId") UUID userId, @Param("speciesId") Integer speciesId);

    @Modifying
    @Query("update SpeciesWatch w set w.lastNotifiedAt = :ts where w.id in :ids")
    int bumpLastNotifiedAt(@Param("ids") List<UUID> ids, @Param("ts") Instant ts);
}
