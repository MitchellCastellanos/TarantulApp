package com.tarantulapp.service;

import com.tarantulapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Marks a user as recently active. Throttled in-memory so a chatty client
 * doesn't translate into one DB write per request.
 */
@Service
public class UserActivityService {

    private final UserRepository userRepository;
    private final long throttleMillis;
    private final ConcurrentHashMap<UUID, Long> lastWrittenAt = new ConcurrentHashMap<>();

    public UserActivityService(
            UserRepository userRepository,
            @Value("${app.user-activity.throttle-seconds:60}") long throttleSeconds) {
        this.userRepository = userRepository;
        this.throttleMillis = Duration.ofSeconds(Math.max(1, throttleSeconds)).toMillis();
    }

    /** Update last_activity_at if the cached value for this user is older than the throttle window. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void touch(UUID userId) {
        if (userId == null) {
            return;
        }
        long now = System.currentTimeMillis();
        Long previous = lastWrittenAt.get(userId);
        if (previous != null && (now - previous) < throttleMillis) {
            return;
        }
        lastWrittenAt.put(userId, now);
        userRepository.touchLastActivity(userId, LocalDateTime.now());
    }
}
