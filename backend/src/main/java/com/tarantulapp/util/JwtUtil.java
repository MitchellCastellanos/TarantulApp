package com.tarantulapp.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    private SecretKey getKey() {
        String s = secret == null ? "" : secret.trim();
        if (s.length() < 32) {
            throw new IllegalStateException(
                    "JWT secret must be at least 32 bytes (configure app.jwt.secret or JWT_SECRET; check application-local.properties)");
        }
        return Keys.hmacShaKeyFor(s.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String email) {
        log.debug("Generating token for {}", email);
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getKey())
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parser().verifyWith(getKey()).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed [{}]: {}", e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }
}
