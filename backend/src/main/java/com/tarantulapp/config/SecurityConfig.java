package com.tarantulapp.config;

import com.tarantulapp.util.JwtUtil;
import com.tarantulapp.security.AuthRateLimitFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * CORS vía {@code http.cors()}: no usar {@code WebSecurityCustomizer#ignoring()} en /api/auth ni búsquedas,
 * porque entonces el preflight OPTIONS no pasa por el CorsFilter de la cadena de seguridad y el navegador
 * bloquea llamadas desde :5174 a :8080.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsStr;

    @Bean
    @Order(1)
    public SecurityFilterChain filterChain(HttpSecurity http, JwtUtil jwtUtil, UserDetailsService userDetailsService,
                                           AuthRateLimitFilter authRateLimitFilter,
                                            CorsConfigurationSource corsConfigurationSource) throws Exception {
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwtUtil, userDetailsService);
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/change-password").authenticated()
                        // AntPath explícito (POST + sin método): evita 403 si el matcher MVC no alinea con la URI.
                        .requestMatchers(
                                AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/auth/login"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/auth/register"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/auth/forgot-password"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/auth/reset-password"),
                                AntPathRequestMatcher.antMatcher(HttpMethod.POST, "/api/auth/oauth/google"),
                                AntPathRequestMatcher.antMatcher("/api/auth/login"),
                                AntPathRequestMatcher.antMatcher("/api/auth/register"),
                                AntPathRequestMatcher.antMatcher("/api/auth/forgot-password"),
                                AntPathRequestMatcher.antMatcher("/api/auth/reset-password"),
                                AntPathRequestMatcher.antMatcher("/api/auth/oauth/google")
                        ).permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/api/billing/webhook").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/species", "/api/species/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/gbif/search", "/api/wsc/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/gbif/**", "/api/wsc/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(authRateLimitFilter, JwtAuthFilter.class)
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler((req, res, exDenied) -> {
                            if (log.isWarnEnabled()) {
                                log.warn(
                                        "403 uri={} method={} msg={}",
                                        req.getRequestURI(),
                                        req.getMethod(),
                                        exDenied.getMessage());
                            }
                            if (!res.isCommitted()) {
                                res.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden");
                            }
                        })
                        .authenticationEntryPoint((req, res, e) -> {
                            if (log.isWarnEnabled() && req.getRequestURI() != null
                                    && req.getRequestURI().contains("/feedings")) {
                                String auth = req.getHeader("Authorization");
                                log.warn(
                                        "401 no autenticado uri={} method={} authorizationPresent={} authorizationLength={}",
                                        req.getRequestURI(),
                                        req.getMethod(),
                                        auth != null,
                                        auth != null ? auth.length() : 0);
                            }
                            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                        }));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        Set<String> originPatterns = new LinkedHashSet<>();
        originPatterns.add("http://localhost:*");
        originPatterns.add("http://127.0.0.1:*");
        originPatterns.add("https://localhost:*");
        originPatterns.add("https://127.0.0.1:*");
        for (int p : new int[] { 5173, 5174, 5175, 3000, 4173 }) {
            originPatterns.add("http://localhost:" + p);
            originPatterns.add("http://127.0.0.1:" + p);
        }
        for (String o : allowedOriginsStr.split(",")) {
            String t = o.trim();
            if (!t.isEmpty()) {
                originPatterns.add(t);
            }
        }
        config.setAllowedOriginPatterns(new ArrayList<>(originPatterns));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
