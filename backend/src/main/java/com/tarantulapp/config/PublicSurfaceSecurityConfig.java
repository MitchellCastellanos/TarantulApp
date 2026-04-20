package com.tarantulapp.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Cadena prioritaria sin {@link JwtAuthFilter}: WSC/GBIF búsqueda, auth anónima y preflight CORS.
 * {@link AntPathRequestMatcher} a veces no coincide con la URI real del request; este matcher
 * usa la misma convención que {@link JwtAuthFilter#stripContextPath(HttpServletRequest)}.
 */
@Configuration
public class PublicSurfaceSecurityConfig {

    /**
     * Cubre OPTIONS global (CORS), GET bajo /api/gbif y /api/wsc, y POST de auth público.
     */
    static final class PublicSurfaceRequestMatcher implements RequestMatcher {

        @Override
        public boolean matches(HttpServletRequest request) {
            String path = normalizePath(stripContextPath(request));
            String method = request.getMethod();
            if (method == null) {
                return false;
            }
            if ("OPTIONS".equalsIgnoreCase(method)) {
                return true;
            }
            if ("GET".equalsIgnoreCase(method)
                    && (path.startsWith("/api/gbif/") || path.startsWith("/api/wsc/"))) {
                return true;
            }
            if ("POST".equalsIgnoreCase(method)) {
                return "/api/auth/login".equals(path)
                        || "/api/auth/register".equals(path)
                        || "/api/auth/forgot-password".equals(path)
                        || "/api/auth/reset-password".equals(path);
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

        private static String normalizePath(String path) {
            if (path == null || path.isEmpty()) {
                return "";
            }
            if (path.length() > 1 && path.endsWith("/")) {
                return path.substring(0, path.length() - 1);
            }
            return path;
        }
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain publicSearchAndAuthSurfaceChain(HttpSecurity http,
                                                               CorsConfigurationSource corsConfigurationSource)
            throws Exception {
        RequestMatcher matcher = new PublicSurfaceRequestMatcher();
        http.securityMatcher(matcher)
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
