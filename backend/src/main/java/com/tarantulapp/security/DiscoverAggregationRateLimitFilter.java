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
 * Throttles public discover flows that fan out to GBIF / WSC / iNat (search + taxon sheet).
 * Per client IP, 1-minute sliding window via {@link RateLimiter}.
 */
@Component
public class DiscoverAggregationRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(DiscoverAggregationRateLimitFilter.class);
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final RateLimiter rateLimiter;
    private final int searchMaxPerWindow;
    private final int taxonMaxPerWindow;

    public DiscoverAggregationRateLimitFilter(
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.discover-search-per-minute:45}") int searchMaxPerWindow,
            @Value("${app.rate-limit.discover-taxon-per-minute:90}") int taxonMaxPerWindow) {
        this.rateLimiter = rateLimiter;
        this.searchMaxPerWindow = Math.max(1, searchMaxPerWindow);
        this.taxonMaxPerWindow = Math.max(1, taxonMaxPerWindow);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String p = RequestPaths.stripContextPath(request);
        return !(isDiscoverSearchPath(p) || isDiscoverTaxonPath(p));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String p = RequestPaths.stripContextPath(request);
        String ip = clientIp(request);
        if (isDiscoverSearchPath(p)) {
            String key = "discoverSearch|" + ip;
            if (!rateLimiter.allow(key, searchMaxPerWindow, WINDOW)) {
                log.warn("rate_limit_discover_search ip={} path={}", ip, request.getRequestURI());
                throw new RateLimitExceededException(
                        "Demasiadas búsquedas en Descubrir. Espera un minuto o reduce la velocidad de escritura.");
            }
        } else if (isDiscoverTaxonPath(p)) {
            String key = "discoverTaxon|" + ip;
            if (!rateLimiter.allow(key, taxonMaxPerWindow, WINDOW)) {
                log.warn("rate_limit_discover_taxon ip={} path={}", ip, request.getRequestURI());
                throw new RateLimitExceededException(
                        "Demasiadas consultas de ficha taxonómica. Intenta de nuevo en 1 minuto.");
            }
        }
        filterChain.doFilter(request, response);
    }

    private static boolean isDiscoverSearchPath(String p) {
        return "/api/species/discover-search".equals(p) || "/api/public/discover/search".equals(p);
    }

    private static boolean isDiscoverTaxonPath(String p) {
        return "/api/species/discover-taxon".equals(p) || "/api/public/discover/taxon".equals(p);
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
