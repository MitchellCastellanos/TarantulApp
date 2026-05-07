package com.tarantulapp.repository;

import com.tarantulapp.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Query("SELECT r FROM RefreshToken r WHERE r.userId = :userId AND r.revokedAt IS NULL ORDER BY r.lastUsedAt DESC NULLS LAST, r.createdAt DESC")
    List<RefreshToken> findActiveByUser(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now WHERE r.userId = :userId AND r.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :cutoff")
    int deleteExpired(@Param("cutoff") Instant cutoff);
}
