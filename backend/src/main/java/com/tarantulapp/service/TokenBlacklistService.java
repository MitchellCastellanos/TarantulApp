package com.tarantulapp.service;

import com.tarantulapp.entity.TokenBlacklistEntry;
import com.tarantulapp.repository.TokenBlacklistRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;

/**
 * Tracks revoked JWT access tokens. Hot path is {@link #isRevoked(String)} which runs on every
 * authenticated request, so Redis (when configured) handles it: a single GET on a key with the
 * token's residual TTL — no DB hit. Without Redis, falls back to a SQL lookup against
 * {@code token_blacklist}; the table also keeps an audit history when Redis is enabled.
 */
@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String REDIS_PREFIX = "blacklist:";

    private final TokenBlacklistRepository repository;
    private final ObjectProvider<StringRedisTemplate> redisProvider;
    private final String jwtSecret;

    public TokenBlacklistService(TokenBlacklistRepository repository,
                                 ObjectProvider<StringRedisTemplate> redisProvider,
                                 @Value("${app.jwt.secret}") String jwtSecret) {
        this.repository = repository;
        this.redisProvider = redisProvider;
        this.jwtSecret = jwtSecret;
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        String hash = sha256Hex(rawToken);
        Instant expiresAt = parseExpiry(rawToken);
        Instant effectiveExpiry = expiresAt != null ? expiresAt : Instant.now().plusSeconds(86_400);

        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis != null) {
            try {
                Duration ttl = Duration.between(Instant.now(), effectiveExpiry);
                if (ttl.isNegative() || ttl.isZero()) ttl = Duration.ofSeconds(60);
                redis.opsForValue().set(REDIS_PREFIX + hash, "1", ttl);
            } catch (Exception e) {
                log.warn("Redis revoke failed for hash[…{}]: {}", hash.substring(56), e.getMessage());
            }
        }
        // Always write the audit row too: it's our durable history when Redis is unavailable or
        // gets flushed, and survives restarts.
        if (!repository.existsByTokenHash(hash)) {
            TokenBlacklistEntry entry = new TokenBlacklistEntry();
            entry.setTokenHash(hash);
            entry.setExpiresAt(effectiveExpiry);
            repository.save(entry);
        }
    }

    public boolean isRevoked(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        String hash = sha256Hex(rawToken);
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis != null) {
            try {
                Boolean exists = redis.hasKey(REDIS_PREFIX + hash);
                if (Boolean.TRUE.equals(exists)) {
                    return true;
                }
                // Redis says no; that's authoritative for revocations issued after Redis was
                // enabled. Skip the DB check to keep the hot path one round-trip.
                return false;
            } catch (Exception e) {
                log.warn("Redis blacklist check failed (falling back to DB): {}", e.getMessage());
            }
        }
        try {
            return repository.existsByTokenHash(hash);
        } catch (Exception e) {
            // Fail-open on transient DB issues: an authenticated user must not be locked out
            // because Postgres hiccupped. The window is bounded by the access-token expiry.
            log.warn("Token blacklist check failed (fail-open): {}", e.getMessage());
            return false;
        }
    }

    /** Daily purge so the table doesn't grow unbounded with already-expired tokens. */
    @Scheduled(cron = "0 0 3 * * *")
    @SchedulerLock(name = "tokenBlacklistPurge", lockAtLeastFor = "PT30S", lockAtMostFor = "PT5M")
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
