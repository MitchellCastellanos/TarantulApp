package com.tarantulapp.repository;

import com.tarantulapp.entity.DevicePushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevicePushTokenRepository extends JpaRepository<DevicePushToken, UUID> {
    Optional<DevicePushToken> findByToken(String token);
    Optional<DevicePushToken> findByUserIdAndToken(UUID userId, String token);
    List<DevicePushToken> findByUserIdAndEnabledTrue(UUID userId);
    void deleteByUserIdAndToken(UUID userId, String token);

    @Query("""
            select distinct d.userId
            from DevicePushToken d
            where d.enabled = true
              and d.platform = :platform
              and d.userId <> :excludedUserId
            """)
    List<UUID> findDistinctEnabledUserIdsByPlatformExcludingUserId(String platform, UUID excludedUserId);
}
