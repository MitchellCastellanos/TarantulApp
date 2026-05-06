package com.tarantulapp.security;

import java.time.Duration;

/**
 * Per-key fixed-window counter shared by all {@code *RateLimitFilter} servlet filters. Two
 * implementations live in this package: in-memory (default, single-replica) and Redis (set as
 * the primary bean by {@code RedisConfig} when {@code app.redis.enabled=true}). Filters depend
 * only on this interface so we can switch without touching their logic.
 */
public interface RateLimiter {

    /**
     * Returns true if the request is within the budget. The first call inside a window opens it
     * (TTL = window); subsequent calls increment a counter and pass while the count is at or
     * below {@code maxPerWindow}.
     *
     * @param key            stable per-actor key (IP, userId, etc.); should already be namespaced
     * @param maxPerWindow   inclusive upper bound for calls in the window
     * @param window         length of the rolling window
     */
    boolean allow(String key, int maxPerWindow, Duration window);
}
