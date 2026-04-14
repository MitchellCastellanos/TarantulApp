package com.tarantulapp.repository;

import com.tarantulapp.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenAndUsedFalse(String token);
    void deleteByUserId(UUID userId);
}
