package com.tarantulapp.repository;

import com.tarantulapp.entity.KeeperProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface KeeperProfileRepository extends JpaRepository<KeeperProfile, UUID> {
    Optional<KeeperProfile> findByHandleIgnoreCase(String handle);
    boolean existsByHandleIgnoreCaseAndUserIdNot(String handle, UUID userId);
}
