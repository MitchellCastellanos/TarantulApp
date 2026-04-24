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
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Caps abuse-prone POST endpoints that the existing filters do not yet cover.
 * <p>
 * Today: public moderation reports (one bucket per IP) and Sex ID voting
 * (bucket keyed by authenticated user, with IP fallback for unauthenticated
 * fallthroughs while the security chain is still resolving). All buckets are
 * in-memory and per-instance — fine for a single Railway/Fly.io node, would
 * need Redis once we scale horizontally (tracked in Stream F).
 */
@Component
public class AbuseRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AbuseRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final String REPORTS_PREFIX = "/api/public/reports/";
    private static final String SEX_ID_PREFIX = "/api/sex-id-cases/";
    private static final String SEX_ID_VOTE_SUFFIX = "/vote";

    private final int reportsMaxPerWindow;
    private final int sexIdVoteMaxPerWindow;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public AbuseRateLimitFilter(
            @Value("${app.rate-limit.reports-per-minute:8}") int reportsMaxPerWindow,
            @Value("${app.rate-limit.sex-id-vote-per-minute:30}") int sexIdVoteMaxPerWindow) {
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
        Bucket bucket = buckets.computeIfAbsent(limit.key, ignored -> new Bucket());
        if (!bucket.allow(limit.maxPerWindow)) {
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
        // The id segment between the prefix and the /vote suffix must be non-empty.
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
