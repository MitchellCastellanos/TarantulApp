package com.tarantulapp.repository;

import com.tarantulapp.entity.DevicePushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevicePushTokenRepository extends JpaRepository<DevicePushToken, UUID> {
    Optional<DevicePushToken> findByToken(String token);
    Optional<DevicePushToken> findByUserIdAndToken(UUID userId, String token);
    List<DevicePushToken> findByUserIdAndEnabledTrue(UUID userId);
    void deleteByUserIdAndToken(UUID userId, String token);
}
