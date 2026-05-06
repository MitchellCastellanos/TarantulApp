package com.tarantulapp.security;

import com.tarantulapp.exception.RateLimitExceededException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final RateLimiter rateLimiter;
    private final int defaultMaxPerWindow;
    private final int loginMaxPerWindow;
    private final int registerMaxPerWindow;
    private final int recoveryMaxPerWindow;
    private final int oauthMaxPerWindow;

    public AuthRateLimitFilter(
            RateLimiter rateLimiter,
            @Value("${app.auth-rate-limit-per-minute:25}") int defaultMaxPerWindow,
            @Value("${app.auth-rate-limit.login-per-minute:12}") int loginMaxPerWindow,
            @Value("${app.auth-rate-limit.register-per-minute:8}") int registerMaxPerWindow,
            @Value("${app.auth-rate-limit.recovery-per-minute:6}") int recoveryMaxPerWindow,
            @Value("${app.auth-rate-limit.oauth-per-minute:20}") int oauthMaxPerWindow) {
        this.rateLimiter = rateLimiter;
        this.defaultMaxPerWindow = Math.max(1, defaultMaxPerWindow);
        this.loginMaxPerWindow = Math.max(1, loginMaxPerWindow);
        this.registerMaxPerWindow = Math.max(1, registerMaxPerWindow);
        this.recoveryMaxPerWindow = Math.max(1, recoveryMaxPerWindow);
        this.oauthMaxPerWindow = Math.max(1, oauthMaxPerWindow);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        return uri == null || !(
                "/api/auth/login".equals(uri)
                || "/api/auth/register".equals(uri)
                || "/api/auth/forgot-password".equals(uri)
                || "/api/auth/reset-password".equals(uri)
                || "/api/auth/oauth/google".equals(uri)
        );
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        String key = "auth|" + clientIp(request) + "|" + uri;
        if (!rateLimiter.allow(key, limitFor(uri), WINDOW)) {
            throw new RateLimitExceededException("Demasiadas solicitudes. Intenta de nuevo en 1 minuto.");
        }
        filterChain.doFilter(request, response);
    }

    private int limitFor(String uri) {
        if ("/api/auth/login".equals(uri)) return loginMaxPerWindow;
        if ("/api/auth/register".equals(uri)) return registerMaxPerWindow;
        if ("/api/auth/forgot-password".equals(uri) || "/api/auth/reset-password".equals(uri)) {
            return recoveryMaxPerWindow;
        }
        if ("/api/auth/oauth/google".equals(uri)) return oauthMaxPerWindow;
        return defaultMaxPerWindow;
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
