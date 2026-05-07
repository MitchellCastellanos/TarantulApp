package com.tarantulapp.service;

import com.tarantulapp.entity.RefreshToken;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.RefreshTokenRepository;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Issues, rotates, and revokes refresh tokens. Single-use semantics: every successful
 * {@link #rotate} call revokes the presented token and emits a brand-new one. Reusing a revoked
 * token (theft scenario) is treated as a compromised session — we revoke every active token for
 * the same user and force re-authentication.
 *
 * The raw token (a 256-bit URL-safe random string) is only returned once; the DB stores a
 * hex-encoded SHA-256 of it.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;
    private final UserRepository userRepository;
    private final Duration ttl;

    public RefreshTokenService(RefreshTokenRepository repository,
                               UserRepository userRepository,
                               @Value("${app.jwt.refresh-ttl-days:30}") int refreshTtlDays) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.ttl = Duration.ofDays(Math.max(1, refreshTtlDays));
    }

    public record IssuedToken(String rawToken, RefreshToken stored) {}

    @Transactional
    public IssuedToken issue(UUID userId, String deviceLabel) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken entry = new RefreshToken();
        entry.setUserId(userId);
        entry.setTokenHash(sha256Hex(raw));
        entry.setDeviceLabel(truncate(deviceLabel, 120));
        entry.setExpiresAt(Instant.now().plus(ttl));
        repository.save(entry);
        return new IssuedToken(raw, entry);
    }

    @Transactional
    public RotatedSession rotate(String presentedToken, String deviceLabel) {
        if (presentedToken == null || presentedToken.isBlank()) {
            throw new AccessDeniedException("REFRESH_TOKEN_REQUIRED");
        }
        String hash = sha256Hex(presentedToken);
        RefreshToken existing = repository.findByTokenHash(hash)
                .orElseThrow(() -> new AccessDeniedException("REFRESH_TOKEN_INVALID"));

        Instant now = Instant.now();
        if (existing.getRevokedAt() != null) {
            // Reuse of a revoked token → likely theft; nuke every other session for this user.
            int revoked = repository.revokeAllForUser(existing.getUserId(), now);
            log.warn("Refresh token reuse detected for userId={}; revoked {} active tokens",
                    existing.getUserId(), revoked);
            throw new AccessDeniedException("REFRESH_TOKEN_REUSED");
        }
        if (existing.getExpiresAt().isBefore(now)) {
            throw new AccessDeniedException("REFRESH_TOKEN_EXPIRED");
        }

        existing.setRevokedAt(now);
        existing.setLastUsedAt(now);
        repository.save(existing);

        User user = userRepository.findById(existing.getUserId())
                .orElseThrow(() -> new AccessDeniedException("USER_NOT_FOUND"));
        IssuedToken next = issue(user.getId(),
                deviceLabel != null && !deviceLabel.isBlank() ? deviceLabel : existing.getDeviceLabel());
        return new RotatedSession(user, next);
    }

    public record RotatedSession(User user, IssuedToken issued) {}

    @Transactional
    public void revoke(String presentedToken) {
        if (presentedToken == null || presentedToken.isBlank()) return;
        repository.findByTokenHash(sha256Hex(presentedToken)).ifPresent(t -> {
            if (t.getRevokedAt() == null) {
                t.setRevokedAt(Instant.now());
                repository.save(t);
            }
        });
    }

    @Transactional
    public int revokeAll(UUID userId) {
        return repository.revokeAllForUser(userId, Instant.now());
    }

    public List<RefreshToken> listActive(UUID userId) {
        return repository.findActiveByUser(userId);
    }

    static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        return t.length() <= max ? t : t.substring(0, max);
    }
}
