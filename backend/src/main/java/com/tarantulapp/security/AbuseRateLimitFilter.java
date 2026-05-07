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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Caps abuse-prone POST endpoints that the existing filters do not yet cover (public moderation
 * reports and Sex ID voting). Now backed by {@link RateLimiter}, so it shares the Redis bucket
 * with all other filters when {@code app.redis.enabled=true} — no more per-replica drift.
 */
@Component
public class AbuseRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AbuseRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final String REPORTS_PREFIX = "/api/public/reports/";
    private static final String SEX_ID_PREFIX = "/api/sex-id-cases/";
    private static final String SEX_ID_VOTE_SUFFIX = "/vote";

    private final RateLimiter rateLimiter;
    private final int reportsMaxPerWindow;
    private final int sexIdVoteMaxPerWindow;

    public AbuseRateLimitFilter(
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.reports-per-minute:8}") int reportsMaxPerWindow,
            @Value("${app.rate-limit.sex-id-vote-per-minute:30}") int sexIdVoteMaxPerWindow) {
        this.rateLimiter = rateLimiter;
        this.reportsMaxPerWindow = Math.max(1, reportsMaxPerWindow);
        this.sexIdVoteMaxPerWindow = Math.max(1, sexIdVoteMaxPerWindow);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = RequestPaths.stripContextPath(request);
        return !(isReportPath(path) || isSexIdVotePath(path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = RequestPaths.stripContextPath(request);
        Limit limit = limitFor(path, request);
        if (!rateLimiter.allow(limit.key, limit.maxPerWindow, WINDOW)) {
            if (log.isWarnEnabled()) {
                log.warn("rate_limit_abuse path={} key={} max_per_minute={}",
                        path, limit.key, limit.maxPerWindow);
            }
            throw new RateLimitExceededException("Demasiadas solicitudes. Intenta de nuevo en 1 minuto.");
        }
        chain.doFilter(request, response);
    }

    private Limit limitFor(String path, HttpServletRequest request) {
        if (isReportPath(path)) {
            return new Limit("reports|" + clientIp(request), reportsMaxPerWindow);
        }
        String actor = currentUserId();
        String suffix = (actor != null) ? "user|" + actor : "ip|" + clientIp(request);
        return new Limit("sexid_vote|" + suffix, sexIdVoteMaxPerWindow);
    }

    private static boolean isReportPath(String path) {
        return path != null && path.startsWith(REPORTS_PREFIX);
    }

    private static boolean isSexIdVotePath(String path) {
        if (path == null || !path.startsWith(SEX_ID_PREFIX) || !path.endsWith(SEX_ID_VOTE_SUFFIX)) {
            return false;
        }
        int idStart = SEX_ID_PREFIX.length();
        int idEnd = path.length() - SEX_ID_VOTE_SUFFIX.length();
        return idEnd > idStart;
    }

    private static String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal == null) return null;
        String name = auth.getName();
        return (name == null || name.isBlank()) ? null : name;
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }

    private record Limit(String key, int maxPerWindow) {}
}
