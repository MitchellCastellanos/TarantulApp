package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Verifies a "Sign in with Apple" identity token (a JWT signed by Apple with RS256).
 *
 * Apple has no server-side tokeninfo endpoint (unlike Google), so we fetch Apple's public
 * JWKS, rebuild the RSA key matching the token's {@code kid}, and verify the signature,
 * issuer and (when configured) audience locally before trusting the email claim.
 */
@Component
public class AppleSignInVerifier {

    private static final Logger log = LoggerFactory.getLogger(AppleSignInVerifier.class);
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final String APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();
    // Cache JWKS RSA keys by `kid`; Apple rotates keys rarely, refresh on a cache miss.
    private final Map<String, RSAPublicKey> keyCache = new ConcurrentHashMap<>();

    /** Comma-separated allowed audiences: the iOS bundle id and/or the web Services ID. */
    @Value("${app.auth.apple.client-ids:}")
    private String allowedClientIds;

    public record AppleIdentity(String email, boolean emailVerified) {}

    public AppleIdentity verify(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
        }
        String kid = readKeyId(identityToken);
        RSAPublicKey key = resolveKey(kid);

        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith((PublicKey) key)
                    .requireIssuer(APPLE_ISSUER)
                    .build()
                    .parseSignedClaims(identityToken)
                    .getPayload();
        } catch (Exception e) {
            log.warn("Apple identity token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
        }

        assertAudience(claims);

        Object emailRaw = claims.get("email");
        String email = emailRaw == null ? "" : String.valueOf(emailRaw).trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) {
            // Apple only omits the email if the relationship was set up without the email scope.
            throw new IllegalArgumentException("APPLE_EMAIL_MISSING");
        }
        Object verifiedRaw = claims.get("email_verified");
        boolean verified = verifiedRaw != null
                && ("true".equalsIgnoreCase(String.valueOf(verifiedRaw)) || Boolean.TRUE.equals(verifiedRaw));
        return new AppleIdentity(email, verified);
    }

    private void assertAudience(Claims claims) {
        Set<String> allowed = parseAllowedClientIds();
        if (allowed.isEmpty()) {
            // No audience configured yet (setup phase): signature + issuer already validated.
            log.warn("APP_AUTH_APPLE_CLIENT_IDS not set — skipping Apple token audience check");
            return;
        }
        Set<String> aud = claims.getAudience();
        if (aud == null || aud.stream().noneMatch(allowed::contains)) {
            log.warn("Apple identity token audience {} not in allowed {}", aud, allowed);
            throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
        }
    }

    private Set<String> parseAllowedClientIds() {
        Set<String> out = new HashSet<>();
        if (allowedClientIds == null || allowedClientIds.isBlank()) {
            return out;
        }
        Arrays.stream(allowedClientIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .forEach(out::add);
        return out;
    }

    private RSAPublicKey resolveKey(String kid) {
        RSAPublicKey cached = keyCache.get(kid);
        if (cached != null) {
            return cached;
        }
        refreshKeys();
        RSAPublicKey key = keyCache.get(kid);
        if (key == null) {
            throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
        }
        return key;
    }

    private void refreshKeys() {
        try {
            Map<String, Object> body = restClient.get()
                    .uri(APPLE_JWKS_URL)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            JsonNode keys = objectMapper.valueToTree(body).path("keys");
            for (JsonNode jwk : keys) {
                if (!"RSA".equalsIgnoreCase(jwk.path("kty").asText())) {
                    continue;
                }
                String kid = jwk.path("kid").asText(null);
                String n = jwk.path("n").asText(null);
                String e = jwk.path("e").asText(null);
                if (kid == null || n == null || e == null) {
                    continue;
                }
                keyCache.put(kid, buildRsaKey(n, e));
            }
        } catch (RuntimeException ex) {
            log.error("Could not fetch Apple JWKS: {}", ex.getMessage());
            throw new IllegalArgumentException("APPLE_KEYS_UNAVAILABLE");
        }
    }

    private RSAPublicKey buildRsaKey(String nB64Url, String eB64Url) {
        try {
            BigInteger modulus = new BigInteger(1, Base64.getUrlDecoder().decode(nB64Url));
            BigInteger exponent = new BigInteger(1, Base64.getUrlDecoder().decode(eB64Url));
            return (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new RSAPublicKeySpec(modulus, exponent));
        } catch (Exception ex) {
            throw new IllegalArgumentException("APPLE_KEY_PARSE_FAILED");
        }
    }

    private String readKeyId(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
            }
            JsonNode header = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            String kid = header.path("kid").asText(null);
            if (kid == null || kid.isBlank()) {
                throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
            }
            return kid;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("APPLE_TOKEN_INVALID");
        }
    }
}
