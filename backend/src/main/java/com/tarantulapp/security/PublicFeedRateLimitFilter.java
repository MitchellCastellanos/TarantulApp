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

/** Rate-limits anonymous GET requests to the public community feed. */
@Component
public class PublicFeedRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(PublicFeedRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final RateLimiter rateLimiter;
    private final int maxPerWindow;

    public PublicFeedRateLimitFilter(
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.public-feed-per-minute:90}") int maxPerWindow) {
        this.rateLimiter = rateLimiter;
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
        if (!rateLimiter.allow(key, maxPerWindow, WINDOW)) {
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
}
