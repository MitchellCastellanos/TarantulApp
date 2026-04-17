package com.tarantulapp.config;

import com.tarantulapp.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtAuthFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String token = extractBearerToken(header);
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!jwtUtil.isTokenValid(token)) {
            log.warn("Invalid JWT on {}", request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        // Siempre aplicar el JWT cuando el Bearer es válido (no condicionar a getAuthentication() == null).
        try {
            String email = jwtUtil.extractEmail(token);
            var userDetails = userDetailsService.loadUserByUsername(email);
            var auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("Authenticated user: {}", email);
        } catch (UsernameNotFoundException e) {
            log.warn("User from JWT not found in DB: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("JWT processing failed: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
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
