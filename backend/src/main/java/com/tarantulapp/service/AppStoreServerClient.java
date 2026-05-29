package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;

/**
 * Thin client for the Apple App Store Server API (transaction lookup).
 *
 * Builds the ES256 JWT required by Apple from the .p8 private key, calls
 * {@code GET /inApps/v1/transactions/{transactionId}} (production first, then sandbox),
 * and decodes the returned signed transaction JWS payload.
 *
 * Note: the JWS comes from Apple over authenticated TLS; full x5c certificate-chain
 * verification of the signature is a recommended hardening follow-up.
 */
@Component
public class AppStoreServerClient {

    private static final Logger log = LoggerFactory.getLogger(AppStoreServerClient.class);
    private static final String PROD_BASE = "https://api.storekit.itunes.apple.com";
    private static final String SANDBOX_BASE = "https://api.storekit-sandbox.itunes.apple.com";
    private static final String AUDIENCE = "appstoreconnect-v1";

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${billing.apple.key-id:}")
    private String keyId;

    @Value("${billing.apple.issuer-id:}")
    private String issuerId;

    @Value("${billing.apple.bundle-id:}")
    private String bundleId;

    @Value("${billing.apple.private-key-path:}")
    private String privateKeyPath;

    private volatile PrivateKey signingKey;

    public boolean isConfigured() {
        return notBlank(keyId) && notBlank(issuerId) && notBlank(bundleId) && notBlank(privateKeyPath);
    }

    /**
     * @return the decoded signed transaction payload, or {@code null} if Apple returns 404
     *         (unknown transaction) in both production and sandbox.
     */
    public JsonNode lookupTransaction(String transactionId) {
        if (!isConfigured()) {
            throw new IllegalStateException("APPLE_SERVER_API_NOT_CONFIGURED");
        }
        String token = buildBearerToken();
        JsonNode payload = lookup(PROD_BASE, transactionId, token);
        if (payload == null) {
            // Apple recommends retrying against sandbox for TestFlight / sandbox transactions.
            payload = lookup(SANDBOX_BASE, transactionId, token);
        }
        return payload;
    }

    private JsonNode lookup(String base, String transactionId, String token) {
        try {
            String body = restClient.get()
                    .uri(base + "/inApps/v1/transactions/{id}", transactionId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .body(String.class);
            if (body == null || body.isBlank()) {
                return null;
            }
            JsonNode root = objectMapper.readTree(body);
            String signedTransactionInfo = root.path("signedTransactionInfo").asText(null);
            if (signedTransactionInfo == null || signedTransactionInfo.isBlank()) {
                return null;
            }
            return decodeJwsPayload(signedTransactionInfo);
        } catch (Exception e) {
            log.warn("App Store transaction lookup failed at {}: {}", base, e.getMessage());
            return null;
        }
    }

    private JsonNode decodeJwsPayload(String jws) throws Exception {
        String[] parts = jws.split("\\.");
        if (parts.length < 2) {
            throw new IllegalArgumentException("APPLE_JWS_INVALID");
        }
        byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
        return objectMapper.readTree(payload);
    }

    private String buildBearerToken() {
        try {
            Date now = new Date();
            Date exp = new Date(now.getTime() + 30 * 60 * 1000L); // <= 1h per Apple; use 30 min.
            return Jwts.builder()
                    .header().keyId(keyId.trim()).add("typ", "JWT").and()
                    .issuer(issuerId.trim())
                    .issuedAt(now)
                    .expiration(exp)
                    .audience().add(AUDIENCE).and()
                    .claim("bid", bundleId.trim())
                    .signWith(getSigningKey(), Jwts.SIG.ES256)
                    .compact();
        } catch (Exception e) {
            log.error("Could not build App Store Server API token: {}", e.getMessage());
            throw new IllegalStateException("APPLE_SERVER_API_TOKEN_FAILED");
        }
    }

    private PrivateKey getSigningKey() throws Exception {
        PrivateKey cached = signingKey;
        if (cached != null) {
            return cached;
        }
        String pem = Files.readString(Path.of(privateKeyPath.trim()));
        String der = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] bytes = Base64.getDecoder().decode(der);
        PrivateKey key = KeyFactory.getInstance("EC")
                .generatePrivate(new PKCS8EncodedKeySpec(bytes));
        signingKey = key;
        return key;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
