package com.tarantulapp.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Default {@link RateLimiter} when Redis is not configured. Counts per-key in a process-local
 * map; correct for a single replica. With multiple replicas each instance has its own bucket,
 * so the effective limit is N * maxPerWindow — that's why production must enable Redis once we
 * scale horizontally (see {@code RedisRateLimiter}).
 */
@Component
public class InMemoryRateLimiter implements RateLimiter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean allow(String key, int maxPerWindow, Duration window) {
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket());
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
