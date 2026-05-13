package com.tarantulapp.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Default {@link RateLimiter} when Redis is not configured. Counts per-key in a process-local
 * map; correct for a single replica. With multiple replicas each instance has its own bucket,
 * so the effective limit is N * maxPerWindow — that's why production must enable Redis once we
 * scale horizontally (see {@code RedisRateLimiter}).
 *
 * <p>The bucket store is a bounded Caffeine cache: each unique key (e.g. {@code "auth|<ip>|<uri>"})
 * is evicted after 10 minutes of inactivity, and the cache is capped at 50k live entries. Before
 * the bound, a flood of unique IPs or rotating userIds would grow the map without ever evicting,
 * leaking heap and adding pressure to the same container that bounds the JVM Metaspace.</p>
 */
@Component
public class InMemoryRateLimiter implements RateLimiter {

    /** Eviction window: ten minutes is well past the longest rate-limit window (1 min). */
    private static final Duration BUCKET_TTL = Duration.ofMinutes(10);

    /** Hard cap so a malicious flood of unique keys cannot exhaust heap. */
    private static final long MAX_BUCKETS = 50_000L;

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(BUCKET_TTL)
            .maximumSize(MAX_BUCKETS)
            .build();

    @Override
    public boolean allow(String key, int maxPerWindow, Duration window) {
        Bucket bucket = buckets.get(key, ignored -> new Bucket());
        return bucket.allow(maxPerWindow, window);
    }

    private static final class Bucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile Instant windowStart = Instant.now();

        boolean allow(int maxPerWindow, Duration window) {
            Instant now = Instant.now();
            if (Duration.between(windowStart, now).compareTo(window) > 0) {
                synchronized (this) {
                    if (Duration.between(windowStart, now).compareTo(window) > 0) {
                        windowStart = now;
                        count.set(0);
                    }
                }
            }
            return count.incrementAndGet() <= maxPerWindow;
        }
    }
}
