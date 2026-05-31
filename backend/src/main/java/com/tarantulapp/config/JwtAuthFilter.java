package com.tarantulapp.config;

import com.tarantulapp.service.TokenBlacklistService;
import com.tarantulapp.service.UserActivityService;
import com.tarantulapp.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Solo se instancia desde {@link SecurityConfig} y se añade con {@code addFilterBefore}.
 * No usar {@code @Component}: Spring Boot registraría el mismo filtro en el contenedor Servlet
 * y volvería a ejecutarse en la cadena de seguridad → 401/403 erráticos en rutas públicas.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserActivityService userActivityService;
    private final TokenBlacklistService tokenBlacklistService;

    public JwtAuthFilter(JwtUtil jwtUtil,
                         UserDetailsService userDetailsService,
                         UserActivityService userActivityService,
                         TokenBlacklistService tokenBlacklistService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        this.userActivityService = userActivityService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = stripContextPath(request);
        // Ficha por QR: sin Bearer sigue siendo anónimo; con Bearer debemos poblar SecurityContext
        // para que el backend permita al dueño ver tarántula privada en /api/public/t/{shortId}.
        if (uri.startsWith("/api/public/t/")) {
            return !hasBearer(request);
        }
        if (uri.startsWith("/api/public/sex-id-cases")) {
            return !hasBearer(request);
        }
        if (uri.startsWith("/api/public/")) {
            return true;
        }
        // Login / registro / reset: sin parsear Bearer (token caducado en el navegador no debe afectar POST públicos).
        if (uri.startsWith("/api/auth/")
                && !"/api/auth/change-password".equals(uri)
                && !"/api/auth/beta-agreement".equals(uri)
                && !"/api/auth/delete-account".equals(uri)
                && !"/api/auth/vendor-invite/accept".equals(uri)
                && !"/api/auth/logout".equals(uri)) {
            return true;
        }
        // Búsquedas taxonómicas: siempre sin filtro JWT (evita 401 con sesión en WSC/GBIF).
        if ("GET".equalsIgnoreCase(request.getMethod())
                && (uri.startsWith("/api/wsc/") || uri.startsWith("/api/gbif/"))) {
            return true;
        }
        // Sin Bearer: no parsear JWT en GET /api/species (Descubrir invitado).
        // Con Bearer: filtrar para que {@code SpeciesController} distinga sesión en GET /api/species.
        if ("GET".equalsIgnoreCase(request.getMethod()) && !hasBearer(request) && uri.startsWith("/api/species")) {
            return true;
        }
        return false;
    }

    private static String stripContextPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return "";
        }
        String ctx = request.getContextPath();
        if (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) {
            uri = uri.substring(ctx.length());
        }
        return uri;
    }

    private static boolean hasBearer(HttpServletRequest request) {
        String h = request.getHeader("Authorization");
        if (h == null) {
            return false;
        }
        String t = h.trim();
        return t.regionMatches(true, 0, "Bearer", 0, 6) && t.length() > 7 && !t.substring(7).trim().isEmpty();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractBearerToken(request.getHeader("Authorization"));
        String userId = null;
        // Track whether we mutated the MDC so we always clean it up — Tomcat threads are pooled,
        // and a stale "user_id" attached to a later request would leak PII into unrelated logs.
        boolean mdcUserIdPlaced = false;

        if (token != null) {
            JwtUtil.ValidationResult jwtStatus = jwtUtil.validateToken(token);
            if (jwtStatus == JwtUtil.ValidationResult.EXPIRED) {
                log.debug("Expired JWT on {}", request.getRequestURI());
            } else if (jwtStatus == JwtUtil.ValidationResult.INVALID) {
                log.debug("Invalid JWT on {}", request.getRequestURI());
            } else if (tokenBlacklistService.isRevoked(token)) {
                log.debug("Revoked JWT presented on {}", request.getRequestURI());
            } else {
                // Siempre aplicar el JWT cuando el Bearer es válido (no condicionar a getAuthentication() == null).
                try {
                    String email = jwtUtil.extractEmail(token);
                    var userDetails = userDetailsService.loadUserByUsername(email);
                    var auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug("Authenticated user: {}", email);
                    if (userDetails instanceof AppUserDetails appUser) {
                        userId = appUser.id().toString();
                        MDC.put("user_id", userId);
                        mdcUserIdPlaced = true;
                    }
                } catch (UsernameNotFoundException e) {
                    log.warn("User from JWT not found in DB: {}", e.getMessage());
                } catch (Exception e) {
                    log.warn("JWT processing failed: {}", e.getMessage());
                }
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            if (userId != null) {
                try {
                    userActivityService.touch(UUID.fromString(userId));
                } catch (Exception e) {
                    log.debug("Could not record user activity: {}", e.getMessage());
                }
            }
            // Cleanup happens unconditionally on the placed-flag, not on userId presence, so a
            // bug that leaves userId null after a put() can never strand the MDC entry.
            if (mdcUserIdPlaced) {
                MDC.remove("user_id");
            }
        }
    }

    /** Acepta "Bearer ", "bearer ", etc. (algunos proxies/clientes alteran mayúsculas). */
    private static String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null) {
            return null;
        }
        String h = authorizationHeader.trim();
        if (h.length() < 8) {
            return null;
        }
        if (!h.regionMatches(true, 0, "Bearer", 0, 6)) {
            return null;
        }
        if (h.charAt(6) != ' ') {
            return null;
        }
        String raw = h.substring(7).trim();
        return raw.isEmpty() ? null : raw;
    }
}
