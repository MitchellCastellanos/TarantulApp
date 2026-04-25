package com.tarantulapp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Dedicated security chain for Actuator endpoints.
 * <p>
 * {@code /actuator/health} (and its liveness/readiness probes) is permitAll so external
 * uptime checks and container orchestrators can poll without credentials. Every other
 * Actuator endpoint (info, metrics, prometheus, env, beans…) is gated behind a fixed
 * {@code X-Admin-Token} header compared against {@code app.management.token}. When the
 * token property is empty, those endpoints are always rejected with 403 — safer default
 * than exposing metrics to the world.
 */
@Configuration
public class ActuatorSecurityConfig {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 10)
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http,
                                                           ActuatorTokenFilter actuatorTokenFilter) throws Exception {
        http.securityMatcher("/actuator/**")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET,
                                "/actuator/health",
                                "/actuator/health/**").permitAll()
                        .anyRequest().permitAll())
                .addFilterBefore(actuatorTokenFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Component
    public static class ActuatorTokenFilter extends OncePerRequestFilter {

        private final String expectedToken;

        public ActuatorTokenFilter(@Value("${app.management.token:}") String expectedToken) {
            this.expectedToken = expectedToken == null ? "" : expectedToken.trim();
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            String uri = request.getRequestURI();
            if (uri == null || !uri.startsWith("/actuator")) {
                return true;
            }
            return uri.equals("/actuator/health")
                    || uri.startsWith("/actuator/health/");
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        HttpServletResponse response,
                                        FilterChain chain) throws ServletException, IOException {
            String provided = request.getHeader("X-Admin-Token");
            if (expectedToken.isEmpty() || provided == null || !expectedToken.equals(provided.trim())) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden");
                return;
            }
            chain.doFilter(request, response);
        }
    }
}
