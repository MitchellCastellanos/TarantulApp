package com.tarantulapp.service;

import com.tarantulapp.entity.TokenBlacklistEntry;
import com.tarantulapp.repository.TokenBlacklistRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Tracks revoked JWT access tokens (logout). The hot-path check (isRevoked) runs on every
 * authenticated request through {@link com.tarantulapp.config.JwtAuthFilter}, so it must
 * be fast: a single indexed lookup on the SHA-256 hex hash of the raw bearer token.
 *
 * Phase 2 will move the lookup to Redis with TTL = (token expiry - now); the SQL table
 * remains as audit history.
 */
@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);

    private final TokenBlacklistRepository repository;
    private final String jwtSecret;

    public TokenBlacklistService(TokenBlacklistRepository repository,
                                 @Value("${app.jwt.secret}") String jwtSecret) {
        this.repository = repository;
        this.jwtSecret = jwtSecret;
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        String hash = sha256Hex(rawToken);
        if (repository.existsByTokenHash(hash)) {
            return;
        }
        TokenBlacklistEntry entry = new TokenBlacklistEntry();
        entry.setTokenHash(hash);
        Instant expiresAt = parseExpiry(rawToken);
        entry.setExpiresAt(expiresAt != null ? expiresAt : Instant.now().plusSeconds(86_400));
        UUID userId = parseUserIdFromSubject(rawToken);
        entry.setUserId(userId);
        repository.save(entry);
    }

    public boolean isRevoked(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        try {
            return repository.existsByTokenHash(sha256Hex(rawToken));
        } catch (Exception e) {
            // Fail-open on transient DB issues: an authenticated user must not be locked out
            // because Postgres hiccupped. The window is bounded by the access-token expiry.
            log.warn("Token blacklist check failed (fail-open): {}", e.getMessage());
            return false;
        }
    }

    /** Daily purge so the table doesn't grow unbounded with already-expired tokens. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpired() {
        try {
            int removed = repository.deleteExpired(Instant.now());
            if (removed > 0) {
                log.info("token_blacklist: purged {} expired entries", removed);
            }
        } catch (Exception e) {
            log.warn("token_blacklist purge failed: {}", e.getMessage());
        }
    }

    private Instant parseExpiry(String rawToken) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(rawToken).getPayload();
            Date exp = claims.getExpiration();
            return exp != null ? exp.toInstant() : null;
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private UUID parseUserIdFromSubject(String rawToken) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(rawToken).getPayload();
            // Subject is the email (see JwtUtil.generateToken). userId is not in the claims today.
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
