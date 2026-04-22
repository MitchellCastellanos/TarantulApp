package com.tarantulapp.security;

import com.tarantulapp.exception.RateLimitExceededException;
import com.tarantulapp.util.RequestPaths;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** Rate-limits anonymous GET requests to the public community feed. */
@Component
public class PublicFeedRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(PublicFeedRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final int maxPerWindow;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public PublicFeedRateLimitFilter(
            @Value("${app.rate-limit.public-feed-per-minute:90}") int maxPerWindow) {
        this.maxPerWindow = Math.max(1, maxPerWindow);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return !"/api/public/community/feed".equals(RequestPaths.stripContextPath(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String ip = clientIp(request);
        String key = "pubfeed|" + ip;
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket());
        if (!bucket.allow(maxPerWindow)) {
            if (log.isWarnEnabled()) {
                log.warn("rate_limit_feed ip={} path={}", ip, request.getRequestURI());
            }
            throw new RateLimitExceededException("Demasiadas solicitudes al feed. Intenta de nuevo en 1 minuto.");
        }
        filterChain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }

    private static final class Bucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile Instant windowStart = Instant.now();

        boolean allow(int maxPerWindow) {
            Instant now = Instant.now();
            if (Duration.between(windowStart, now).compareTo(WINDOW) > 0) {
                synchronized (this) {
                    if (Duration.between(windowStart, now).compareTo(WINDOW) > 0) {
                        windowStart = now;
                        count.set(0);
                    }
                }
            }
            return count.incrementAndGet() <= maxPerWindow;
        }
    }
}
