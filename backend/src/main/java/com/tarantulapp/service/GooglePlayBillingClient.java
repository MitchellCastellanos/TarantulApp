package com.tarantulapp.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.androidpublisher.AndroidPublisher;
import com.google.api.services.androidpublisher.AndroidPublisherScopes;
import com.google.api.services.androidpublisher.model.SubscriptionPurchaseV2;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Thin wrapper around Google Play Android Publisher API (subscriptions v2).
 */
@Component
public class GooglePlayBillingClient {

    private static final Logger log = LoggerFactory.getLogger(GooglePlayBillingClient.class);

    @Value("${billing.google-play.service-account-json-path:}")
    private String serviceAccountJsonPath;

    private volatile AndroidPublisher androidPublisher;

    public boolean isConfigured() {
        return serviceAccountJsonPath != null && !serviceAccountJsonPath.isBlank();
    }

    /**
     * @return purchase details, or {@code null} when Google returns 404 (unknown / expired token).
     */
    public SubscriptionPurchaseV2 getSubscriptionPurchaseV2(String packageName, String purchaseToken) {
        if (!isConfigured()) {
            throw new IllegalArgumentException("GOOGLE_PLAY_SERVICE_ACCOUNT_NOT_CONFIGURED");
        }
        try {
            AndroidPublisher pub = getOrCreatePublisher();
            return pub.purchases()
                    .subscriptionsv2()
                    .get(packageName, purchaseToken)
                    .execute();
        } catch (GoogleJsonResponseException e) {
            int code = e.getStatusCode();
            if (code == 404) {
                log.warn("Google Play subscriptionsv2.get 404 package={} tokenPrefix={}",
                        packageName, purchaseTokenPrefix(purchaseToken));
                return null;
            }
            log.error("Google Play API error status={} details={}", code, e.getDetails());
            throw new IllegalArgumentException("GOOGLE_PLAY_API_ERROR");
        } catch (IOException | GeneralSecurityException e) {
            log.error("Google Play client failure: {}", e.getMessage());
            throw new IllegalStateException("GOOGLE_PLAY_CLIENT_FAILURE", e);
        }
    }

    private static String purchaseTokenPrefix(String t) {
        if (t == null || t.length() < 12) {
            return "(short)";
        }
        return t.substring(0, 12) + "…";
    }

    private AndroidPublisher getOrCreatePublisher() throws IOException, GeneralSecurityException {
        AndroidPublisher cached = androidPublisher;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (androidPublisher != null) {
                return androidPublisher;
            }
            Path p = Path.of(serviceAccountJsonPath.trim());
            if (!Files.isRegularFile(p)) {
                throw new IOException("Service account JSON not found: " + p);
            }
            try (InputStream in = new FileInputStream(p.toFile())) {
                GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                        .createScoped(Collections.singleton(AndroidPublisherScopes.ANDROIDPUBLISHER));
                androidPublisher = new AndroidPublisher.Builder(
                        GoogleNetHttpTransport.newTrustedTransport(),
                        GsonFactory.getDefaultInstance(),
                        new HttpCredentialsAdapter(credentials))
                        .setApplicationName("TarantulApp Backend")
                        .build();
                return androidPublisher;
            }
        }
    }
}
