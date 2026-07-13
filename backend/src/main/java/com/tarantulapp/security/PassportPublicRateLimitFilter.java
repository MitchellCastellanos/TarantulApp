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

/**
 * Rate-limits the public passport surface at /api/public/t/**.
 * Claims get a tight per-IP budget (anti brute-force of shortIds and claim codes);
 * profile reads get a generous one (anti shortId enumeration without hurting real visitors).
 */
@Component
public class PassportPublicRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(PassportPublicRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final String PREFIX = "/api/public/t/";

    private final RateLimiter rateLimiter;
    private final int maxViewsPerWindow;
    private final int maxClaimsPerWindow;

    public PassportPublicRateLimitFilter(
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.passport-public-per-minute:120}") int maxViewsPerWindow,
            @Value("${app.rate-limit.passport-claim-per-minute:10}") int maxClaimsPerWindow) {
        this.rateLimiter = rateLimiter;
        this.maxViewsPerWindow = Math.max(1, maxViewsPerWindow);
        this.maxClaimsPerWindow = Math.max(1, maxClaimsPerWindow);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !RequestPaths.stripContextPath(request).startsWith(PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = RequestPaths.stripContextPath(request);
        String ip = clientIp(request);
        boolean isClaim = "POST".equalsIgnoreCase(request.getMethod()) && path.endsWith("/claim");

        String key = (isClaim ? "passclaim|" : "passview|") + ip;
        int budget = isClaim ? maxClaimsPerWindow : maxViewsPerWindow;
        if (!rateLimiter.allow(key, budget, WINDOW)) {
            if (log.isWarnEnabled()) {
                log.warn("rate_limit_passport ip={} claim={} path={}", ip, isClaim, request.getRequestURI());
            }
            throw new RateLimitExceededException("Demasiadas solicitudes. Intenta de nuevo en 1 minuto.");
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
