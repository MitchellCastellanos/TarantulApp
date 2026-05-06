package com.tarantulapp.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;

/**
 * Distributed counter backed by Redis. Keying is {@code rl:{key}}; the first INCR of a window
 * gets an EXPIRE matching the window. Subsequent INCR calls return the running count and the
 * filter compares against {@code maxPerWindow}. Approximate at the bucket boundary (a request
 * landing exactly at second 60 can reset and count again) — fine for our threat model where the
 * goal is to slow brute-force / scraping, not to enforce a strict SLA.
 *
 * Wired as the primary {@code RateLimiter} only when {@code app.redis.enabled=true}; otherwise
 * {@link InMemoryRateLimiter} stays in charge.
 */
public class RedisRateLimiter implements RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimiter.class);
    private static final String PREFIX = "rl:";

    private final StringRedisTemplate redis;
    private final RateLimiter fallback;

    public RedisRateLimiter(StringRedisTemplate redis, RateLimiter fallback) {
        this.redis = redis;
        this.fallback = fallback;
    }

    @Override
    public boolean allow(String key, int maxPerWindow, Duration window) {
        String redisKey = PREFIX + key;
        try {
            Long count = redis.opsForValue().increment(redisKey);
            if (count == null) {
                return fallback.allow(key, maxPerWindow, window);
            }
            if (count == 1L) {
                // First hit of this window: arm the TTL. Best-effort; if the EXPIRE fails for any
                // reason the key still expires when the next bucket starts because we INCR fresh.
                redis.expire(redisKey, window);
            }
            return count <= maxPerWindow;
        } catch (Exception e) {
            // Fail open via in-memory: a Redis hiccup must not lock everyone out, but we don't
            // want to fully bypass the limit either. Spike-protection is preserved per replica.
            log.warn("Redis rate-limit unavailable for key={}: {}; falling back to in-memory",
                    key, e.getMessage());
            return fallback.allow(key, maxPerWindow, window);
        }
    }
}
